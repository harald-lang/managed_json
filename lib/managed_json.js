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
const EventEmitter = require('events');
//===-------------------------------------------------------------------------------------------==//
const VERSIONING_DATA_PROP = '__versioning__';
const LOG_PROP = 'log';
const ORIGINAL_ROOT_HIDDEN_PROP = Symbol('rootObject');
const PATH_HIDDEN_PROP = Symbol('path');
const EVENT_EMITTER_HIDDEN_PROP = Symbol('eventEmitter');
//===-------------------------------------------------------------------------------------------==//
const OperationType = {
  SET: 'set',
  DELETE: 'delete',

  isValid: (opName) => {
    switch (opName) {
      case OperationType.SET:
      case OperationType.DELETE:
        return true;
      default:
        return false;
    }
  }
};
Object.freeze(OperationType);
//===-------------------------------------------------------------------------------------------==//
class LogEntry {
  static create(op, path, value) {
    return {
      op,
      path,
      value
    }
  }

  static apply(object, logEntry) {
    if (!this.isValid(logEntry)) {
      throw new TypeError('Malformed log entry detected.')
    }

    switch (logEntry.op) {

      case OperationType.SET: {
        const setPathRec = (o, p, i) => {
          if (p.length === i + 1) {
            o[p[i]] = logEntry.value;
          }
          else {
            setPathRec(o[p[i]], p, i + 1);
          }
        };
        setPathRec(object, logEntry.path, 0);
        break;
      }

      case OperationType.DELETE: {
        const deletePathRec = (o, p, i) => {
          if (p.length === i + 1) {
            delete o[p[i]];
          }
          else {
            deletePathRec(o[p[i]], p, i + 1);
          }
        };
        deletePathRec(object, logEntry.path, 0);
        break;
      }
    }
  }

  static isValid(l) {
    return _.isObject(l)
      && l.hasOwnProperty('op') && OperationType.isValid(l.op)
      && l.hasOwnProperty('path') && Array.isArray(l.path)
      && l.hasOwnProperty('value');
  }
}
LogEntry.OperationType = OperationType;
Object.freeze(LogEntry);
//===-------------------------------------------------------------------------------------------==//
function isValidProperty(prop) {
  return typeof prop === 'string';
}
//===-------------------------------------------------------------------------------------------==//
function isAssignable(value) {
  if (typeof value === 'function') {
    return false;
  }
  if (typeof value === 'symbol') {
    return false;
  }
  if (value === null) {
    return true;
  }
  if (Array.isArray(value)) {
    for (const arrayElement of value) {
      const retVal = isAssignable(arrayElement);
      if (!retVal) {
        return false;
      }
    }
  }
  else if (typeof value === 'object') {
    if (value.constructor && value.constructor.name !== 'Object') {
      return false;
    }
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length > 0) {
      return false;
    }
    for (const prop in value) {
      const retval = isValidProperty(prop) && isAssignable(value[prop]);
      if (!retval) {
        return false;
      }
    }
  }
  return true;
}
//===-------------------------------------------------------------------------------------------==//
function isManageable(object) {
  return !Array.isArray(object) && isAssignable(object);
}
//===-------------------------------------------------------------------------------------------==//
function createProxyHandler(rootObject, path, eventEmitter, readOnly = false) {
  return {
    rootObject_: rootObject,
    path_: path,
    eventEmitter_: eventEmitter,
    readOnly_: readOnly,

    has(target, property) {
      return Reflect.has(...arguments);
    },

    get(target, property, receiver) {
      if (typeof property === 'symbol') {
        // Provide access to hidden properties from within this module.

        // Provide access to the original (non-proxied) object.
        if (property === ORIGINAL_ROOT_HIDDEN_PROP) {
          return this.rootObject_;
        }
        // Provide access to the path.
        if (property === PATH_HIDDEN_PROP) {
          return this.path_;
        }
        // Provide access to the event emitter.
        if (property === EVENT_EMITTER_HIDDEN_PROP) {
          return this.eventEmitter_;
        }
      }
      const value = Reflect.get(...arguments);
      if (!_.isNil(value) && typeof value === 'object') {
        let path = [...this.path_];
        path.push(property);
        const readOnly = (path.length === 1 && path[0] === VERSIONING_DATA_PROP)
          ? true
          : this.readOnly_;
        const proxy = new Proxy(value,
          createProxyHandler(this.rootObject_, path, eventEmitter, readOnly));
        return proxy;
      }
      else {
        return value;
      }
    },

    set(target, property, value, receiver) {
      if (this.readOnly_) {
        throw new Error('Attempt to write read-only property.');
      }
      if (!isValidProperty(property)) {
        throw new TypeError('Illegal attempt to use an invalid property type.');
      }
      if (!isAssignable(value)) {
        throw new TypeError('Illegal attempt to add an non-manageable value.');
      }
      const success = Reflect.set(...arguments); // forward the set operation
      if (success) {

        // Add log entry.
        const log = ManagedJson._getLog(this.rootObject_);
        const logEntry =
          LogEntry.create(OperationType.SET, [...this.path_, property], _.cloneDeep(value));
        log.push(logEntry);

        // Emit a change event.
        const logSequenceNumber = log.length - 1;
        const event = {
          lsn: logSequenceNumber,
          logEntry: _.cloneDeep(logEntry)
        };
        Object.freeze(event);
        Object.freeze(event.logEntry);
        this.eventEmitter_.emit('change', event);
      }
      return success;
    },

    deleteProperty(target, property) {
      if (this.readOnly_) {
        throw new Error('Attempt to delete read-only property.');
      }
      const success = Reflect.deleteProperty(...arguments); // forward the set operation
      if (success) {
        const log = ManagedJson._getLog(this.rootObject_);
        const logEntry =
          LogEntry.create(OperationType.DELETE, [...this.path_, property], null);
        log.push(logEntry);
      }
      return success;
    }
  };
}
//===-------------------------------------------------------------------------------------------==//
class ManagedJson {

  constructor() {
    throw new Error('Attempt to instantiate pure static class.');
  }

  /**
   * Creates a managed data object.
   * @param {Object} object - The object that should be managed.
   * @returns The managed copy of the given object.
   */
  static create(object) {
    if (this.isManaged(object)) {
      throw new TypeError('The given object is already managed.');
    }
    if (!isManageable(object)) {
      throw new TypeError(
        `Illegal attempt to manage an object that contains invalid values.`);
    }

    const o = _.cloneDeep(object) || {};

    // Check whether the object contains version information.
    if (!!o[VERSIONING_DATA_PROP]) {
      if (!o[VERSIONING_DATA_PROP][LOG_PROP]) {
        throw new TypeError('Failed to re-attach the object due to invalid versioning data.')
      }
      const log = o[VERSIONING_DATA_PROP][LOG_PROP];

      // Validate the log by reconstructing the object from the log and perform an a/b comparison.
      const a = _.cloneDeep(log[0].value);
      for (let i = 1; i <= log.length - 1; ++i) {
        LogEntry.apply(a, log[i]);
      }

      const b = _.cloneDeep(o);
      delete b[VERSIONING_DATA_PROP];

      if (!_.isEqual(a, b)) {
        throw new TypeError('Failed to re-attach the object due to invalid versioning data.')
      }
    }
    else {
      const versioning = {};
      let value = _.cloneDeep(object);
      versioning[LOG_PROP] = [ LogEntry.create(OperationType.SET, [], value) ];
      o[VERSIONING_DATA_PROP] = versioning;
    }

    const eventEmitter = new EventEmitter();
    return new Proxy(o, createProxyHandler(o, [], eventEmitter));
  }

  /**
   * Determines whether the given object is a managed object.
   * @param {Object} object - The object to test.
   * @throws {TypeError} - Throws, if the object is not managed.
   * @returns {boolean} - True, if the object is managed, false otherwise.
   */
  static isManaged(object) {
    return !!object[ORIGINAL_ROOT_HIDDEN_PROP];
  }

  /**
   * Returns the number of versions of the given managed object.
   * @param {Object} object - The managed object.
   * @returns {number} - The number of versions.
   */
  static versionCount(object) {
    this._validate(object);
    return this._getLog(object).length;
  }

  /**
   * Restore the given version of the managed object.
   * @param {Object} object - The managed object.
   * @param {number} versionId - The version number to restore.
   * @returns {Object} - The restored object.
   */
  static restoreVersion(object, versionId) {
    this._validate(object);
    // Memorize the current path.
    const path = this._getPath(object);
    const rootObject = this.getRootObject(object);
    const unmanagedRootObject = rootObject[ORIGINAL_ROOT_HIDDEN_PROP];
    const log = this._getLog(unmanagedRootObject);
    if (versionId >= log.length || versionId < 0) {
      throw Error('Invalid version ID.');
    }
    const o = _.cloneDeep(log[0].value);
    for (let i = 1; i <= versionId; ++i) {
      LogEntry.apply(o, log[i]);
    }

    // Navigate to the nested element.
    const nav = (o, p, i) => {
      if (i >= p.length) {
        return o;
      }
      const n = o[p[i]];
      if (n) {
        return nav(n, p, i + 1);
      }
    };
    const nested = nav(o, path, 0);

    return nested;
  }

  /**
   * Creates a deep (unmanaged) clone of the given managed object.
   * @param {Object} object - The object to detach.
   * @throws {TypeError} - Throws, if the object is not managed.
   * @returns {Object} - An unmanaged copy.
   */
  static detach(object) {
    this._validate(object);
    const clone = _.cloneDeep(object);
    delete clone[VERSIONING_DATA_PROP];
    return clone;
  }

  /**
   * Creates a deep (unmanaged) clone of the given managed object. Unlike the {@link #detach}
   * function, this function preserves the internal data such as the version history, which is
   * useful when a managed object need to be detached and re-attached later on without losing the
   * version history.
   *
   * Typical use cases are transferring a managed object via a network connection or persisting
   * it into a database.
   * @param {Object} object - The object to detach.
   * @throws {TypeError} - Throws, if the object is not managed.
   * @returns {Object} - An unmanaged copy.
   */
  static detachPreserveVersionData(object) {
    this._validate(object);
    const clone = _.cloneDeep(object);
    return clone;
  }

  /**
   * Determines and returns the root (managed) object.
   * @param {Object} object - A managed object or a nested object thereof.
   * @returns The root object.
   */
  static getRootObject(object) {
    this._validate(object);
    const root = object[ORIGINAL_ROOT_HIDDEN_PROP];
    const eventEmitter = root[EVENT_EMITTER_HIDDEN_PROP];
    return new Proxy(root, createProxyHandler(root, [], eventEmitter));
  }

  /**
   * Returns the redo log of the given managed object.
   * @param {Object} object - A managed object.
   * @returns The redo log of the given managed object.
   */
  static getLog(object) {
    this._validate(object);
    const rootObject = this.getRootObject(object);
    const unmanagedRootObject = rootObject[ORIGINAL_ROOT_HIDDEN_PROP];
    return this._getLog(unmanagedRootObject);
  }

  /**
   * Returns the event emitter of the given managed object. The event emitter is used to register
   * listeners that are to be notified when the managed object changes.
   * @param {Object} object - A managed object.
   * @returns {EventEmitter} - The event emitter of the given object.
   */
  static eventEmitter(object) {
    this._validate(object);
    return object[EVENT_EMITTER_HIDDEN_PROP];
  }

  static _throwIfNotManaged(object) {
    if (!this.isManaged(object)) {
      throw new TypeError('The given object is not managed.');
    }
  }

  static _getLog(object) {
    return object[VERSIONING_DATA_PROP][LOG_PROP]
  }

  static _validate(object) {
    this._throwIfNotManaged(object);
    const rootObject = object[ORIGINAL_ROOT_HIDDEN_PROP];

    // The following errors may not happen, but left there in case of regressions.
    if (!(VERSIONING_DATA_PROP in rootObject)) {
      /* istanbul ignore next line */
      throw TypeError('The given object is not managed.');
    }
    if (!(LOG_PROP in rootObject[VERSIONING_DATA_PROP])) {
      /* istanbul ignore next line */
      throw TypeError('The given object is invalid.');
    }
  }

  static _getPath(managedObject) {
    return managedObject[PATH_HIDDEN_PROP];
  }
}
//===-------------------------------------------------------------------------------------------==//
ManagedJson.Log = LogEntry;
Object.freeze(ManagedJson);
//===-------------------------------------------------------------------------------------------==//
module.exports = ManagedJson;
//===-------------------------------------------------------------------------------------------==//
