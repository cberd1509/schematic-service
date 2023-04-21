/* eslint-disable @typescript-eslint/no-unused-vars */
/* istanbul ignore file */
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';

//Declaration Merging Of Module.
declare module 'typeorm/query-builder/SelectQueryBuilder' {
  interface SelectQueryBuilder<Entity> {
    getRawOneNormalized<T = any>(): Promise<T | undefined>;
    getRawManyNormalized<T = any>(): Promise<T[]>;
  }
}

SelectQueryBuilder.prototype.getRawOneNormalized = function <Entity>(
  this: SelectQueryBuilder<Entity>,
): Promise<Entity> {
  return this.getRawOne().then((result) => {
    if (result) {
      const newObj = {};
      for (const key of Object.keys(result)) {
        newObj[key.toLowerCase()] = result[key];
      }
      return newObj as Entity;
    }
    return result;
  });
};

SelectQueryBuilder.prototype.getRawManyNormalized = function <Entity>(
  this: SelectQueryBuilder<Entity>,
): Promise<Entity[]> {
  return this.getRawMany().then((result) => {
    if (result) {
      const newObj = [];
      for (const row of result) {
        const newRow = {};
        for (const key of Object.keys(row)) {
          newRow[key.toLowerCase()] = row[key];
        }
        newObj.push(newRow);
      }
      return newObj as Entity[];
    }
    return result;
  });
};
