/*
 *    Copyright 2020 Harald Lang
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */
//===-------------------------------------------------------------------------------------------==//
'use strict';
const _ = require('lodash');
const ManagedJson = require('./managed_json');
//===-------------------------------------------------------------------------------------------==//
describe('Basic functionality', () => {

  test('Construct plain empty object', () => {
    const o = ManagedJson.create({});
    expect(ManagedJson.isManaged(o)).toBe(true);
    expect(ManagedJson.versionCount(o)).toBe(1);
  });

});
//===-------------------------------------------------------------------------------------------==//
test('Adding a property should increment the version count', () => {
  const o = ManagedJson.create({});
  o.prop = 42;
  expect(ManagedJson.versionCount(o)).toBe(2);
});
//===-------------------------------------------------------------------------------------------==//
test('Updating an existing property should increment the version count', () => {
  const o = ManagedJson.create({prop: 41});
  o.prop = 42;
  expect(ManagedJson.versionCount(o)).toBe(2);
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct initial version', () => {
  const v = ManagedJson.create({prop: 41});
  v.prop = 42;
  const i = ManagedJson.restoreVersion(v, 0);
  expect(i.prop).toBe(41);
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct with an invalid version id must throw', () => {
  const v = ManagedJson.create({prop: 41}); // version 0
  v.prop = 42; // version 1
  expect(() => ManagedJson.restoreVersion(v, -1)).toThrow();
  expect(() => ManagedJson.restoreVersion(v, 2)).toThrow();
});
//===-------------------------------------------------------------------------------------------==//
test('Detach from version control', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  const i = ManagedJson.detach(v);
  expect(i).toStrictEqual(o);
});
//===-------------------------------------------------------------------------------------------==//
test('Detach from version control with a non-empty log', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  o.x = 0;
  delete o.x;
  const i = ManagedJson.detach(v);
  expect(i).toStrictEqual(o);
});
//===-------------------------------------------------------------------------------------------==//
test('Detach object with perserved versioning data must not be recognized as managed', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  const i = ManagedJson.detachPreserveVersionData(v);
  expect(ManagedJson.isManaged(i)).toBeFalsy();
});
//===-------------------------------------------------------------------------------------------==//
test('Detach from version control and re-attach', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  const i = ManagedJson.detach(v);
  const r = ManagedJson.create(i);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('Attach a clone to version control must preserve versions', () => {
  const v = ManagedJson.create({prop: 41});
  v.other = 1337;
  const clone = _.cloneDeep(v);
  const r = ManagedJson.create(clone);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('Detach and re-attach preserving versions', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  v.x = 42;
  v.y = 43;
  const i = ManagedJson.detachPreserveVersionData(v);
  const r = ManagedJson.create(i);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('Detach and re-attach preserving versions (log contains an object value)', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  v.x = { a: 42 };
  v.x.b = 43;
  const i = ManagedJson.detachPreserveVersionData(v);
  const r = ManagedJson.create(i);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('Detach and re-attach preserving versions (log contains an array value)', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  v.x = [42];
  v.x.push(43);
  const i = ManagedJson.detachPreserveVersionData(v);
  const r = ManagedJson.create(i);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('Re-attach object with missing log must throw', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  v.x = 42;
  v.y = 43;
  const i = ManagedJson.detachPreserveVersionData(v);
  delete i['__versioning__']['log'];
  expect(() => ManagedJson.create(i)).toThrow();
});
//===-------------------------------------------------------------------------------------------==//
test('Re-attach object with incomplete log must throw', () => {
  const o = {prop: 41};
  const v = ManagedJson.create(o);
  v.x = 42;
  v.y = 43;
  const i = ManagedJson.detachPreserveVersionData(v);
  i.z = 44;
  expect(() => ManagedJson.create(i)).toThrow();
});
//===-------------------------------------------------------------------------------------------==//
test('Detach nested object from version control', () => {
  const o = {a: {b: 1}};
  const v = ManagedJson.create(o);
  const n = v.a;
  const d = ManagedJson.detach(n);
  expect(ManagedJson.isManaged(d)).toBe(false);
  expect(d).toStrictEqual(n);
});
//===-------------------------------------------------------------------------------------------==//
test('Detaching a non-managed object must throw', () => {
  const o = {};
  expect(() => ManagedJson.detach(o)).toThrow();
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct object with multiple properties', () => {
  const v = ManagedJson.create({a: 42});
  v.b = 1337;
  v.c = 4711;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct object with nested properties', () => {
  const v = ManagedJson.create({a: 42});
  v.b = { c:  4711 };
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct object with deeply nested properties', () => {
  const v = ManagedJson.create({a: 42});
  v.b = { c: { d: 4711 }};
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct object with properties deletions', () => {
  const v = ManagedJson.create({a: 1});
  v.b = 2;
  v.c = 3;
  delete v.a;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Reconstruct nested object', () => {
  const v = ManagedJson.create({}); // version 0
  v.a = {}; // version 1
  v.a.b = 1; // version 2
  v.a.c = 2; // version 3
  delete v.a.b; // version 4

  const n = v.a; // nested object
  let r = ManagedJson.restoreVersion(n, 1);
  expect(r).toStrictEqual({});
  r = ManagedJson.restoreVersion(n, 2);
  expect(r).toStrictEqual({b: 1});
  r = ManagedJson.restoreVersion(n, 3);
  expect(r).toStrictEqual({b: 1, c: 2});
});
//===-------------------------------------------------------------------------------------------==//
test('Delete nested property.', () => {
  const v = ManagedJson.create({a: 1});
  v.b = { c: { d: 2, e: 3} };
  delete v.b.c.d;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Set nested property', () => {
  const v = ManagedJson.create({ a: { b: { c: { d: 2, e: 3} } } });
  v.a.b.c.f = 42;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Update nested property', () => {
  const v = ManagedJson.create({ a: { b: { c: { d: 2, e: 3} } } });
  v.a.b.c.e = 4;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Update property in root object', () => {
  const v = ManagedJson.create({ a: { b: { c: { d: 2, e: 3} } } });
  v.a = 0;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Set property to null', () => {
  const v = ManagedJson.create({ a: { b: { c: { d: 2, e: 3} } } });
  v.a = null;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('Set nested property to null', () => {
  const v = ManagedJson.create({ a: { b: { c: { d: 2, e: 3} } } });
  v.a.b.c.d = null;
  const i = ManagedJson.restoreVersion(v, ManagedJson.versionCount(v) - 1);
  expect(i).toStrictEqual(ManagedJson.detach(v));
});
//===-------------------------------------------------------------------------------------------==//
test('A plain empty object must not be under version control', () => {
  const o = {};
  expect(ManagedJson.isManaged(o)).toBe(false);
});
//===-------------------------------------------------------------------------------------------==//
test('A (deep) copy must not be under version control', () => {
  const v = ManagedJson.create({ a: { b: 1 } });
  const clone = _.cloneDeep(v);
  expect(ManagedJson.isManaged(clone)).toBe(false);
});
//===-------------------------------------------------------------------------------------------==//
test('A (deep) copy must contain the redo log', () => {
  const v = ManagedJson.create({ a: { b: 1 } });
  v.a.b = 2
  const clone = _.cloneDeep(v);
  expect(ManagedJson.isManaged(clone)).toBe(false);
});
//===-------------------------------------------------------------------------------------------==//
test('A nested object must be under version control', () => {
  const v = ManagedJson.create({ a: { b: 1 } });
  const b = v.a;
  expect(ManagedJson.isManaged(b)).toBe(true);
});
//===-------------------------------------------------------------------------------------------==//
test('A (deep) copy of a nested object must not be under version control', () => {
  const v = ManagedJson.create({ a: { b: 1 } });
  const b = v.a;
  const clone = _.cloneDeep(b);
  expect(ManagedJson.isManaged(clone)).toBe(false);
  expect(clone).toStrictEqual(b);
});
//===-------------------------------------------------------------------------------------------==//
test('The root object must be accessible from a nested object', () => {
  const v = ManagedJson.create({ a: { b: 1 } });
  const b = v.a;
  const r = ManagedJson.getRootObject(b);
  expect(v).toStrictEqual(r);
});
//===-------------------------------------------------------------------------------------------==//
test('The log must be visible', () => {
  const v = ManagedJson.create({});
  expect(v['__versioning__']['log']).toBeDefined();
});
//===-------------------------------------------------------------------------------------------==//
test('The log must be accessible', () => {
  const v = ManagedJson.create({a: 1});
  const log = v['__versioning__']['log'];
  expect(log[0].value).toBeDefined();
  expect(log[0].value).toStrictEqual({a: 1});
});
//===-------------------------------------------------------------------------------------------==//
test('The log must not be deletable', () => {
  const v = ManagedJson.create({a: 1});
  const log = v['__versioning__']['log'];
  const expected = _.cloneDeep(log);
  expect(() => (delete v['__versioning__']['log'])).toThrow(Error);
  expect(v['__versioning__']['log']).toBeDefined();
  expect(v['__versioning__']['log']).toStrictEqual(expected);
});
//===-------------------------------------------------------------------------------------------==//
test('A log entry must not be deletable', () => {
  const v = ManagedJson.create({a: 1});
  const logEntry = v['__versioning__']['log'][0];
  const expected = _.cloneDeep(logEntry);
  expect(() => (delete v['__versioning__']['log'][0])).toThrow(Error);
  expect(v['__versioning__']['log'][0]).toBeDefined();
  expect(v['__versioning__']['log'][0]).toStrictEqual(expected);
});
//===-------------------------------------------------------------------------------------------==//
test('The log must not be modifiable', () => {
  const v = ManagedJson.create({a: 1});
  const log = v['__versioning__']['log'];
  const expected = _.cloneDeep(log);
  expect(() => (v['__versioning__']['log'] = {})).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);

  expect(() => (v['__versioning__']['log'].push(42))).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);

  expect(() => (v['__versioning__']['log'].shift())).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);

  expect(() => (v['__versioning__']['log'].pop())).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);

  expect(() => (delete v['__versioning__']['log'][0])).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);

  expect(() => (delete v['__versioning__']['log'][1000])).toThrow();
  expect(v['__versioning__']['log']).toStrictEqual(expected);
});
//===-------------------------------------------------------------------------------------------==//
test('ManagedJson class must not be used for creating a managed object', () => {
  const v = ManagedJson.create({a: 1});
  expect(() => ManagedJson.create(v)).toThrow(TypeError);
});
//===-------------------------------------------------------------------------------------------==//
test('ManagedJson class must not be constructable', () => {
  expect(() => new ManagedJson()).toThrow();
});
//===-------------------------------------------------------------------------------------------==//
describe('Invalid property types', () => {

  test('Adding a symbol as property name must throw', () => {
    const v = ManagedJson.create({a: 1});
    const sym = Symbol();
    expect(() => v[sym] = 2).toThrow();
    expect(v[sym]).toBeUndefined();
  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Non-assignable types', () => {

  test('Adding a function to a managed object must throw', () => {
    const v = ManagedJson.create({a: 1});
    expect(() => v.fn = () => 'fn').toThrow();
    expect(v.fn).toBeUndefined();
  });

  test('Adding a function as part of an object to a managed object must throw', () => {
    const v = ManagedJson.create({a: 1});
    expect(() => v.fn = { nestedFn: () => 'fn' }).toThrow();
    expect(v.fn).toBeUndefined();
  });

  test('Creating a managed object that contains a function must throw', () => {
    expect(() => ManagedJson.create({ a: 1, fn: function() {
      return 1;
    } })).toThrow();
  });

  test('Creating a managed object that contains a function in a nested object must throw', () => {
    expect(() => ManagedJson.create({ a: 1, b: { fn: function() {
      return 1;
    } }})).toThrow();
  });

  test('Creating a managed object that contains a function in a nested array must throw', () => {
    expect(() => ManagedJson.create({ a: 1, b: { fn: [ function() {
      return 1;
    } ] }})).toThrow();
  });

  test('Adding a symbol property to a managed object must throw', () => {
    const v = ManagedJson.create({a: 1});
    const sym = Symbol();
    expect(() => v[sym] = 2).toThrow();
    expect(v[sym]).toBeUndefined();
  });

  test('Adding a symbol property as part of an object to a managed object must throw', () => {
    const v = ManagedJson.create({a: 1});
    const sym = Symbol();
    expect(() => v.b = { [sym]: 2 }).toThrow();
    expect(v.sym).toBeUndefined();
  });

  test('Creating a managed object that contains a symbol property must throw', () => {
    const sym = Symbol();
    expect(() => ManagedJson.create({ [sym]: 1 })).toThrow();
  });

  test('Creating a managed object that contains a symbol property in a nested object must' +
    ' throw', () => {
    const sym = Symbol();
    expect(() => ManagedJson.create({ a: { [sym]: 1 }})).toThrow();
  });

  test('Creating a managed object that contains a symbol property in a nested array must ' +
    'throw', () => {
    const sym = Symbol();
    expect(() => ManagedJson.create({ a: { b: [ [sym] ] }})).toThrow();
  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Non-manageable types', () => {

  test('Functions are not manageable', () => {
    const fn = () => null;
    expect(() => ManagedJson.create(fn)).toThrow();
  });

  test('Symbols are not manageable', () => {
    const sym = Symbol();
    expect(() => ManagedJson.create(sym)).toThrow();
  });

  test('Strings are not manageable', () => {
    const str = 'string value';
    expect(() => ManagedJson.create(str)).toThrow();
  });

  test('Numbers are not manageable', () => {
    const num = 42;
    expect(() => ManagedJson.create(num)).toThrow();
  });

  test('Null is not manageable', () => {
    expect(() => ManagedJson.create(null)).toThrow();
  });

  test('Undefined is not manageable', () => {
    expect(() => ManagedJson.create()).toThrow();
  });

  test('Classes are not manageable', () => {
    class Clazz {};
    expect(() => ManagedJson.create(Clazz)).toThrow();
  });

  test('Class instances are not manageable', () => {
    class Clazz {};
    const instance = new Clazz();
    expect(() => ManagedJson.create(instance)).toThrow();
  });

  test('Arrays are not (directly) manageable', () => {
    expect(() => ManagedJson.create([])).toThrow();
  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Managed objects with arrays', () => {

  describe('Managed objects with flat arrays', () => {

    test('An object with a nested array is manageable', () => {
      const o = { a: [] };
      const m = ManagedJson.create(o);
      expect(ManagedJson.isManaged(m)).toBeTruthy();
      const d = ManagedJson.detach(m);
      expect(d).toStrictEqual(o);
    });

    test('An array is assignable to a managed object', () => {
      const o = { };
      const m = ManagedJson.create(o);
      m.a = [];
      const d = ManagedJson.detach(m);
      expect(d).toStrictEqual({a: []});
    });

    test('Reconstruct an object that contains an array', () => {
      const m = ManagedJson.create({});
      m.a = [1,2,3];
      m.b = 4
      const d = ManagedJson.detach(m);
      expect(d).toStrictEqual(ManagedJson.restoreVersion(m, ManagedJson.versionCount(m) - 1));
    });

    test('A nested array is manageable', () => {
      const m = ManagedJson.create({a: [1,2,3]});
      const a = m.a;
      a.push(4);
      expect(a).toStrictEqual([1,2,3,4]);
    });

    describe('Track array modifications', () => {

      test('Array.push()', () => {
        const m = ManagedJson.create({a: [0]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.push(1); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        a.push(2); // version 2
        const v2 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([0,1,2]);
      });

      test('Array.shift()', () => {
        const m = ManagedJson.create({a: [0,1,2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.shift(); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        a.shift(); // version 2
        const v2 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([2,3,4]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0,1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([2,3,4]);
      });

      test('Array.fill()', () => {
        const m = ManagedJson.create({a: [0,1,2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.fill(0,2); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,0,0,0]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0,1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,0,0,0]);
      });

      test('Array.pop()', () => {
        const m = ManagedJson.create({a: [0,1,2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.pop(); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        a.pop(); // version 2
        const v2 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0,1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,2,3]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([0,1,2]);
      });

      test('Array.reverse()', () => {
        const m = ManagedJson.create({a: [0,1,2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.reverse(); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([4,3,2,1,0]);
        a.reverse(); // version 2
        const v2 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2,3,4]);

        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0,1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([4,3,2,1,0]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([0,1,2,3,4]);
      });

      test('Array.sort()', () => {
        const m = ManagedJson.create({a: [4,0,2,1,3]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.sort(); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2,3,4]);

        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([4,0,2,1,3]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,2,3,4]);
      });

      test('Array.splice()', () => {
        const m = ManagedJson.create({a: [0,'-','-',2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.splice(1, 2, 1); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2,3,4]);

        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0,'-','-',2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,2,3,4]);
      });

      test('Array.unshift()', () => {
        const m = ManagedJson.create({a: [2,3,4]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a.unshift(0, 1); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2,3,4]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([2,3,4]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,2,3,4]);
      });

      test('Array.subscript', () => {
        const m = ManagedJson.create({a: [2,1,0]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a[0] = 0; // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        a[1] = 1; // version 1
        const v2 = ManagedJson.versionCount(m) - 1;
        a[2] = 2; // version 1
        const v3 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([2,1,0]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1,0]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([0,1,0]);
        expect(ManagedJson.restoreVersion(a, v3)).toStrictEqual([0,1,2]);
      });

      test('Array.subscript out of bounds', () => {
        const m = ManagedJson.create({a: [0]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a;
        a[5] = 5; // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        expect(a).toEqual([0,undefined,undefined,undefined,undefined,5]);
        expect(ManagedJson.restoreVersion(a, v0)).toEqual([0]);
        expect(ManagedJson.restoreVersion(a, v1)).toEqual(
          [0,undefined,undefined,undefined,undefined,5]);
      });

      test('Track nested array modifications', () => {
        const m = ManagedJson.create({a: ['to be ignored',[0]]}); // version 0
        const v0 = ManagedJson.versionCount(m) - 1;
        const a = m.a[1];
        a.push(1); // version 1
        const v1 = ManagedJson.versionCount(m) - 1;
        a.push(2); // version 2
        const v2 = ManagedJson.versionCount(m) - 1;
        expect(a).toStrictEqual([0,1,2]);
        expect(ManagedJson.restoreVersion(a, v0)).toStrictEqual([0]);
        expect(ManagedJson.restoreVersion(a, v1)).toStrictEqual([0,1]);
        expect(ManagedJson.restoreVersion(a, v2)).toStrictEqual([0,1,2]);
      });

    });

  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Event emitter', () => {

  test('Listeners should be notified on changes', () => {
    const m = ManagedJson.create({});
    let receivedNotification = false;
    ManagedJson.eventEmitter(m).on('change', () => {
      receivedNotification = true;
    });

    m.x = 'y';
    expect(receivedNotification).toBeTruthy();
  });

  test('Listeners should receive a valid redo-log entry', () => {
    const m = ManagedJson.create({});
    let event = null;
    ManagedJson.eventEmitter(m).on('change', (e) => {
      event = e;
    });

    m.x = 'y';

    expect(_.isObject(event)).toBeTruthy();

    // Check LSN
    expect('lsn' in event).toBeTruthy();
    expect(typeof event.lsn === 'number').toBeTruthy();
    expect(event.lsn >= 0).toBeTruthy();

    // Check log entry
    expect(ManagedJson.Log.isValid(event.logEntry)).toBeTruthy();
  });

  test('The received redo-log entry must not be mutable', () => {
    const m = ManagedJson.create({});
    let event = null;
    ManagedJson.eventEmitter(m).on('change', (e) => {
      event = e;
    });
    m.x = 'y';
    const logEntry = event.logEntry;
    expect(() => logEntry.not = 'allowed').toThrow();
    expect(() => logEntry.op = 'overwrite not allowed').toThrow();
    expect(() => delete logEntry.op).toThrow();
  });

  test('Log sequence number must consistently increase by 1', () => {
    const m = ManagedJson.create({});
    let lastLsn = 0;
    ManagedJson.eventEmitter(m).on('change', (e) => {
      expect(e.lsn).toBe(lastLsn + 1);
      lastLsn++;
    });

    m.x = '1';
    m.x = '2';
    m.x = '3';
    expect(lastLsn).toBe(3);
  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Object reconstruction based on the redo log', () => {

  const Log = ManagedJson.Log;

  test('Replay assignment operation', () => {
    const o = {};
    Log.apply(o, {op: Log.OperationType.SET, path: ['x'], value: 'y'});
    expect(o).toStrictEqual({x: 'y'});
  });

  test('Replay delete operation', () => {
    const o = {x: 42};
    Log.apply(o, {op: Log.OperationType.DELETE, path: ['x'], value: null});
    expect(o).toStrictEqual({});
  });

  test('Replay on a NULL object must throw', () => {
    const o = null;
    expect(() => Log.apply(o, {op: Log.OperationType.SET, path: ['x'], value: 'y'})).toThrow();
  });

  test('Replay on a UNDEFINED object must throw', () => {
    expect(() => Log.apply(o, {op: Log.OperationType.SET, path: ['x'], value: 'y'})).toThrow();
  });

  test('Replaying an invalid log entry must throw', () => {
    const o = {};
    expect(() => Log.apply(o, {op: Log.OperationType.SET, path: 'x', value: null})).toThrow();
    expect(() => Log.apply(o, {op: 'invalid operation', path: ['x'], value: null})).toThrow();
    expect(() => Log.apply(o, {path: ['x'], value: null})).toThrow();
    expect(() => Log.apply(o, {path: ['x']})).toThrow();
    expect(() => Log.apply(o, {})).toThrow();
  });

  test('Reconstruct complex object', () => {
    const m = ManagedJson.create({});
    m.a = 1;
    m.i = {};
    m.i.a = 2;
    m.i.b = 3;
    m.i.c = [3,2,1];
    m.i.c.sort();

    const redoLog = ManagedJson.getLog(m);
    let r = null;
    redoLog.forEach((logEntry) => {
      if (_.isNull(r)) {
        r = _.cloneDeep(logEntry.value);
      }
      else {
        ManagedJson.Log.apply(r, logEntry);
      }
    });

    const d = ManagedJson.detach(m);
    expect(r).toStrictEqual(d);
  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Replica', () => {

  test('Replica class must not be constructable', () => {
    expect(() => new ManagedJson.Replica()).toThrow();
  });

  test('Create a replica', () => {
    const m = ManagedJson.create({a: 1});
    const s = ManagedJson.getSnapshot(m);
    const r = ManagedJson.Replica.createFromSnapshot(s);
    expect(ManagedJson.Replica.isManaged(r)).toBeTruthy();
    expect(ManagedJson.Replica.detach(r)).toStrictEqual(ManagedJson.detach(m));
  });

  test('Create a replica from a replica', () => {
    const m = ManagedJson.create({a: 1});
    const s = ManagedJson.getSnapshot(m);
    const r_tmp = ManagedJson.Replica.createFromSnapshot(s);
    const r = ManagedJson.Replica.create(r_tmp);
    expect(ManagedJson.Replica.isManaged(r)).toBeTruthy();
    expect(ManagedJson.Replica.detach(r)).toStrictEqual(ManagedJson.detach(m));
  });

  test('A replica created from a replica must not be linked', () => {
    const m = ManagedJson.create({a: 1});
    const r0 = ManagedJson.Replica.create(m);
    // link m and r0
    ManagedJson.eventEmitter(m).on('change', (event) => {
      ManagedJson.Replica.apply(r0, event);
    });

    const r1 = ManagedJson.Replica.create(r0);
    m.a = 2;
    expect(r0.a).toBe(2);
    expect(r1.a).toBe(1);
  });

  test('Creating a replica from a non-valid snapshot must throw', () => {
    expect(() => ManagedJson.Replica.createFromSnapshot(null)).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot([])).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({})).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({a:1})).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({a:[1]})).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({__versioning__: 1})).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({__versioning__: {}})).toThrow();
    expect(() => ManagedJson.Replica.createFromSnapshot({__versioning__: {lsn: 'x'}})).toThrow();
  });

  test('Non-replicas are not managed', () => {
    expect(ManagedJson.Replica.isManaged(null)).toBeFalsy();
    expect(ManagedJson.Replica.isManaged([])).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({})).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({a:1})).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({a:[1]})).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({__versioning__: 1})).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({__versioning__: {}})).toBeFalsy();
    expect(ManagedJson.Replica.isManaged({__versioning__: {lsn: 'x'}})).toBeFalsy();
  });

  test('Obtaining an event emitter of non-replicas must throw', () => {
    expect(() => ManagedJson.Replica.eventEmitter(null)).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter([])).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({})).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({a:1})).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({a:[1]})).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({__versioning__: 1})).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({__versioning__: {}})).toThrow();
    expect(() => ManagedJson.Replica.eventEmitter({__versioning__: {lsn: 'x'}})).toThrow();
  });

  test('Replicas must not be modified directly', () => {
    const m = ManagedJson.create({a: 1});
    const s = ManagedJson.getSnapshot(m);
    const r = ManagedJson.Replica.createFromSnapshot(s);
    expect(() => r.a = 2).toThrow();
    expect(r.a).toBe(1);
    expect(() => r.b = 2).toThrow();
    expect(r.b).toBe(undefined);
    expect(() => delete r.a).toThrow();
    expect(r.a).toBe(1);
  });

  describe('Replicas must be modifiable through log entries', () => {

    let m = null; // the managed object
    let r = null; // the replica

    beforeEach(() => {
      m = ManagedJson.create({});
      r = ManagedJson.Replica.create(m);
      ManagedJson.eventEmitter(m).on('change', (event) => {
        ManagedJson.Replica.apply(r, event);
      });
    });

    afterEach(() => {
      m = null;
      r = null;
    });

    test('Define a property', () => {
      m.a = 1;
      expect(r.a).toBe(1);
    });

    test('Update a property', () => {
      m.a = 1;
      m.a = 2;
      expect(r.a).toBe(2);
    });

    test('Delete a property', () => {
      m.a = 1;
      delete m.a;
      expect(r.a).toBeUndefined();
    });

    test('Define nested properties', () => {
      m.a = {};
      m.a.x = [];
      m.a.x[0] = 1;
      expect(r.a.x[0]).toBe(1);
    });

  });

  describe('Linked replicas must be modifiable through log entries', () => {

    let m = null; // the managed object
    let r = null; // the replica

    beforeEach(() => {
      m = ManagedJson.create({});
      const t = ManagedJson.Replica.create(m);
      // link m and t
      ManagedJson.eventEmitter(m).on('change', (event) => {
        ManagedJson.Replica.apply(t, event);
      });

      r = ManagedJson.Replica.create(t);
      // link t and r
      ManagedJson.Replica.eventEmitter(t).on('change', (event) => {
        ManagedJson.Replica.apply(r, event);
      });

    });

    afterEach(() => {
      m = null;
      r = null;
    });

    test('Define a property', () => {
      m.a = 1;
      expect(r.a).toBe(1);
    });

    test('Update a property', () => {
      m.a = 1;
      m.a = 2;
      expect(r.a).toBe(2);
    });

    test('Delete a property', () => {
      m.a = 1;
      delete m.a;
      expect(r.a).toBeUndefined();
    });

    test('Define a property with ', () => {
      m.a = 1;
      delete m.a;
      expect(r.a).toBeUndefined();
    });

  });

  describe('Out of sync', () => {

    test('Missing change events must cause an error', () => {
      const m = ManagedJson.create({a: 1});
      const r = ManagedJson.Replica.create(m);

      let eventCnt = 0;
      ManagedJson.eventEmitter(m).on('change', (event) => {
        eventCnt++;
        // discard the first event
        if (eventCnt === 1) {
          return;
        }
        expect(() => ManagedJson.Replica.apply(r, event)).toThrow();
      });
      m.a = 2;
      m.a = 3;
      m.b = 'b';
      expect(eventCnt).toBe(3);
      expect(r.a).toBe(1);
      expect(r.b).toBeUndefined();
    });

  });

});
//===-------------------------------------------------------------------------------------------==//
describe('Unsupported use cases', () => {

  test('Attaching a managed object to another one must throw', () => {
    const m1 = ManagedJson.create({});
    const m2 = ManagedJson.create({});
    expect(() => m1.other = m2).toThrow();
  });

  test('Creating a non tree-like managed object must throw', () => {
    const m = ManagedJson.create({x:{}});
    const x = m.x
    expect(() => m.y = x).toThrow();
  });

  test('Modifying an orphaned nested managed object must throw', () => {
    const m = ManagedJson.create({a:{b: {}}});
    const ab = m.a.b;
    delete m.a;
    expect(() => ab.must = 'fail').toThrow();
  });

});
//===-------------------------------------------------------------------------------------------==//
