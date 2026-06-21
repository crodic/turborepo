import { Injectable, Logger } from '@nestjs/common';

type SentryConfig = {
  apiBaseUrl: string;
  authToken?: string;
  organizationSlug?: string;
  projectSlug: string;
  environments: string[];
};

type SentryIssue = {
  id: string;
  shortId?: string;
  title?: string;
  culprit?: string;
  level?: string;
  status?: string;
  count?: string | number;
  userCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  permalink?: string;
  project?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

type SentryStatsResponse = {
  intervals?: string[];
  groups?: Array<{
    by?: Record<string, string>;
    totals?: Record<string, number>;
    series?: Record<string, number[]>;
  }>;
};

type SentrySessionsResponse = {
  groups?: Array<{
    by?: Record<string, string>;
    totals?: Record<string, number>;
    series?: Record<string, number[]>;
  }>;
};

const SENTRY_EVENT_FIELD = 'sum(quantity)';
const SENTRY_USER_FIELD = 'count_unique(user)';
const SENTRY_SESSION_FIELD = 'sum(session)';
const SENTRY_CRASH_FREE_SESSION_FIELD = 'crash_free_rate(session)';
const SENTRY_CRASH_FREE_USER_FIELD = 'crash_free_rate(user)';

@Injectable()
export class SentryMonitoringService {
  private readonly logger = new Logger(SentryMonitoringService.name);

  async getSummary() {
    const config = this.getConfig();

    if (!this.isConfigured(config)) {
      return {
        configured: false,
        reason:
          'Sentry dashboard is not configured. Set SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, and SENTRY_PROJECT_SLUG.',
        requiredEnv: [
          'SENTRY_AUTH_TOKEN',
          'SENTRY_ORG_SLUG',
          'SENTRY_PROJECT_SLUG',
        ],
      };
    }

    try {
      const [
        todayStats,
        trendStats,
        topIssues,
        latestIssues,
        errorsByEnvironment,
        releaseHealth,
        weeklyReport,
      ] = await Promise.all([
        this.getEventStats(config, { statsPeriod: '24h' }),
        this.getEventStats(config, { statsPeriod: '14d', interval: '1d' }),
        this.getIssues(config, { sort: 'freq', statsPeriod: '24h', limit: 5 }),
        this.getIssues(config, { sort: 'date', statsPeriod: '24h', limit: 5 }),
        this.getErrorsByEnvironment(config),
        this.getReleaseHealth(config),
        this.getWeeklyReport(config),
      ]);

      const totalErrorsToday = this.extractTotal(todayStats);
      const trend = this.extractTrend(trendStats);
      const affectedUsersToday = this.sumIssueUserCount(topIssues);

      return {
        configured: true,
        organizationSlug: config.organizationSlug,
        projectSlug: config.projectSlug,
        environments: config.environments,
        generatedAt: new Date().toISOString(),
        metrics: {
          totalErrorsToday,
          affectedUsersToday,
          unresolvedIssues: latestIssues.length,
        },
        errorsByEnvironment,
        topIssues: topIssues.map((issue) => this.mapIssue(issue)),
        latestIssues: latestIssues.map((issue) => this.mapIssue(issue)),
        trend,
        releaseHealth,
        weeklyReport,
        capabilities: {
          totalErrorsToday: true,
          errorsByEnvironment: config.environments.length > 0,
          topIssues: true,
          latestIssues: true,
          errorTrend: true,
          affectedUsers: true,
          releaseHealth: true,
          weeklyReport: true,
        },
      };
    } catch (error) {
      this.logger.warn(`Unable to fetch Sentry summary: ${error}`);

      return {
        configured: true,
        unavailable: true,
        reason: 'Sentry API is unavailable or credentials are invalid.',
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private getConfig(): SentryConfig {
    const environments =
      process.env.SENTRY_DASHBOARD_ENVIRONMENTS?.split(',')
        .map((env) => env.trim())
        .filter(Boolean) ??
      (process.env.SENTRY_ENVIRONMENT ? [process.env.SENTRY_ENVIRONMENT] : []);

    return {
      apiBaseUrl:
        process.env.SENTRY_API_BASE_URL?.replace(/\/$/, '') ??
        'https://sentry.io/api/0',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      organizationSlug: process.env.SENTRY_ORG_SLUG,
      projectSlug: process.env.SENTRY_PROJECT_SLUG || '-1',
      environments,
    };
  }

  private isConfigured(config: SentryConfig) {
    return Boolean(config.authToken && config.organizationSlug);
  }

  private async getIssues(
    config: SentryConfig,
    options: { sort: string; statsPeriod: string; limit: number },
  ): Promise<SentryIssue[]> {
    return this.sentryGet<SentryIssue[]>(
      config,
      `/organizations/${config.organizationSlug}/issues/`,
      {
        project: config.projectSlug,
        query: 'is:unresolved',
        sort: options.sort,
        statsPeriod: options.statsPeriod,
        groupStatsPeriod: options.statsPeriod,
        limit: String(options.limit),
      },
    );
  }

  private async getEventStats(
    config: SentryConfig,
    options: { statsPeriod: string; interval?: string },
  ): Promise<SentryStatsResponse> {
    return this.sentryGet<SentryStatsResponse>(
      config,
      `/organizations/${config.organizationSlug}/stats_v2/`,
      {
        groupBy: 'category',
        field: SENTRY_EVENT_FIELD,
        category: 'error',
        outcome: 'accepted',
        statsPeriod: options.statsPeriod,
        ...(options.interval ? { interval: options.interval } : {}),
        project: config.projectSlug,
      },
    );
  }

  private async getErrorsByEnvironment(config: SentryConfig) {
    if (config.environments.length === 0) {
      return [];
    }

    const results = await Promise.all(
      config.environments.map(async (environment) => {
        const issues = await this.sentryGet<SentryIssue[]>(
          config,
          `/organizations/${config.organizationSlug}/issues/`,
          {
            project: config.projectSlug,
            environment,
            query: 'is:unresolved',
            sort: 'freq',
            statsPeriod: '24h',
            limit: '100',
          },
        );

        return {
          environment,
          unresolvedIssues: issues.length,
          eventsApprox: issues.reduce(
            (sum, issue) => sum + this.toNumber(issue.count),
            0,
          ),
          affectedUsersApprox: this.sumIssueUserCount(issues),
        };
      }),
    );

    return results;
  }

  private async getReleaseHealth(config: SentryConfig) {
    const data = await this.sentryGet<SentrySessionsResponse>(
      config,
      `/organizations/${config.organizationSlug}/sessions/`,
      {
        field: [
          SENTRY_SESSION_FIELD,
          SENTRY_USER_FIELD,
          SENTRY_CRASH_FREE_SESSION_FIELD,
          SENTRY_CRASH_FREE_USER_FIELD,
        ],
        statsPeriod: '14d',
        interval: '1d',
        project: config.projectSlug,
        ...(config.environments.length > 0
          ? { environment: config.environments }
          : {}),
      },
    );
    const totals = this.sumTotals(data.groups ?? []);

    return {
      sessions: totals[SENTRY_SESSION_FIELD] ?? 0,
      users: totals[SENTRY_USER_FIELD] ?? 0,
      crashFreeSessions: totals[SENTRY_CRASH_FREE_SESSION_FIELD] ?? null,
      crashFreeUsers: totals[SENTRY_CRASH_FREE_USER_FIELD] ?? null,
    };
  }

  private async getWeeklyReport(config: SentryConfig) {
    const now = new Date();
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [current, previous] = await Promise.all([
      this.getEventStatsByDate(config, currentStart, now),
      this.getEventStatsByDate(config, previousStart, currentStart),
    ]);
    const currentErrors = this.extractTotal(current);
    const previousErrors = this.extractTotal(previous);
    const changePercent =
      previousErrors > 0
        ? ((currentErrors - previousErrors) / previousErrors) * 100
        : currentErrors > 0
          ? 100
          : 0;

    return {
      currentErrors,
      previousErrors,
      changePercent,
      periodStart: currentStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  private async getEventStatsByDate(
    config: SentryConfig,
    start: Date,
    end: Date,
  ): Promise<SentryStatsResponse> {
    return this.sentryGet<SentryStatsResponse>(
      config,
      `/organizations/${config.organizationSlug}/stats_v2/`,
      {
        groupBy: 'category',
        field: SENTRY_EVENT_FIELD,
        category: 'error',
        outcome: 'accepted',
        start: start.toISOString(),
        end: end.toISOString(),
        project: config.projectSlug,
      },
    );
  }

  private async sentryGet<T>(
    config: SentryConfig,
    path: string,
    params: Record<string, string | string[]>,
  ): Promise<T> {
    const url = new URL(`${config.apiBaseUrl}${path}`);

    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error('[SENTRY API ERROR]', {
        url: url.toString(),
        status: response.status,
        body: errorText,
      });

      throw new Error(`Sentry API failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private extractTotal(data: SentryStatsResponse) {
    return (data.groups ?? []).reduce(
      (sum, group) => sum + (group.totals?.[SENTRY_EVENT_FIELD] ?? 0),
      0,
    );
  }

  private extractTrend(data: SentryStatsResponse) {
    const intervals = data.intervals ?? [];
    const groups = data.groups ?? [];

    return intervals.map((interval, index) => ({
      date: interval,
      errors: groups.reduce(
        (sum, group) =>
          sum + (group.series?.[SENTRY_EVENT_FIELD]?.[index] ?? 0),
        0,
      ),
    }));
  }

  private mapIssue(issue: SentryIssue) {
    return {
      id: issue.id,
      shortId: issue.shortId,
      title: issue.title,
      culprit: issue.culprit,
      level: issue.level,
      status: issue.status,
      count: this.toNumber(issue.count),
      userCount: issue.userCount ?? 0,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      permalink: issue.permalink,
      project: issue.project
        ? {
            id: issue.project.id,
            name: issue.project.name,
            slug: issue.project.slug,
          }
        : null,
    };
  }

  private sumIssueUserCount(issues: SentryIssue[]) {
    return issues.reduce((sum, issue) => sum + (issue.userCount ?? 0), 0);
  }

  private sumTotals(
    groups: Array<{
      totals?: Record<string, number>;
    }>,
  ) {
    return groups.reduce<Record<string, number>>((totals, group) => {
      for (const [key, value] of Object.entries(group.totals ?? {})) {
        totals[key] = (totals[key] ?? 0) + value;
      }

      return totals;
    }, {});
  }

  private toNumber(value: string | number | undefined) {
    if (typeof value === 'number') {
      return value;
    }

    return value ? Number(value) || 0 : 0;
  }
}
