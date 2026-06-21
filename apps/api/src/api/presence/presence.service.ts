import { Injectable } from '@nestjs/common';
import {
  OnlinePresence,
  PresencePrincipal,
  PresenceSnapshot,
  PresenceUserType,
} from './types';

type PresenceRecord = PresencePrincipal & {
  sockets: Set<string>;
  connectedAt: Date;
  lastSeenAt: Date;
};

@Injectable()
export class PresenceService {
  private readonly records = new Map<string, PresenceRecord>();
  private readonly socketIndex = new Map<string, string>();

  add(socketId: string, principal: PresencePrincipal): PresenceSnapshot {
    const key = this.createKey(principal.type, principal.id);
    const now = new Date();
    const record = this.records.get(key);

    if (record) {
      record.sockets.add(socketId);
      record.lastSeenAt = now;
      this.socketIndex.set(socketId, key);

      return this.getSnapshot();
    }

    this.records.set(key, {
      ...principal,
      sockets: new Set([socketId]),
      connectedAt: now,
      lastSeenAt: now,
    });
    this.socketIndex.set(socketId, key);

    return this.getSnapshot();
  }

  remove(socketId: string): PresenceSnapshot {
    const key = this.socketIndex.get(socketId);

    if (!key) {
      return this.getSnapshot();
    }

    const record = this.records.get(key);
    this.socketIndex.delete(socketId);

    if (!record) {
      return this.getSnapshot();
    }

    record.sockets.delete(socketId);
    record.lastSeenAt = new Date();

    if (record.sockets.size === 0) {
      this.records.delete(key);
    }

    return this.getSnapshot();
  }

  getSnapshot(): PresenceSnapshot {
    const admins: OnlinePresence[] = [];
    const users: OnlinePresence[] = [];

    for (const record of this.records.values()) {
      const online = this.toOnlinePresence(record);

      if (record.type === PresenceUserType.ADMIN) {
        admins.push(online);
      } else {
        users.push(online);
      }
    }

    admins.sort((a, b) => a.fullName?.localeCompare(b.fullName ?? '') ?? 0);
    users.sort((a, b) => a.fullName?.localeCompare(b.fullName ?? '') ?? 0);

    return {
      admins,
      users,
      counts: {
        admins: admins.length,
        users: users.length,
        total: admins.length + users.length,
      },
    };
  }

  touch(socketId: string): PresenceSnapshot {
    const key = this.socketIndex.get(socketId);
    const record = key ? this.records.get(key) : null;

    if (record) {
      record.lastSeenAt = new Date();
    }

    return this.getSnapshot();
  }

  private createKey(type: PresenceUserType, id: string | number) {
    return `${type}:${id}`;
  }

  private toOnlinePresence(record: PresenceRecord): OnlinePresence {
    const { sockets, tokenHash, ...data } = record;

    return {
      ...data,
      socketCount: sockets.size,
    };
  }
}
