import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class CustomNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  override uniqueConstraintName(
    tableOrName: Table | string,
    columnNames: string[],
  ): string {
    const tableName =
      tableOrName instanceof Table ? tableOrName.name : tableOrName;
    return `UQ_${tableName}_${columnNames.join('_')}`;
  }

  override indexName(
    tableOrName: Table | string,
    columnNames: string[],
    _where?: string,
  ): string {
    const tableName =
      tableOrName instanceof Table ? tableOrName.name : tableOrName;
    return `IDX_${tableName}_${columnNames.join('_')}`;
  }
}
