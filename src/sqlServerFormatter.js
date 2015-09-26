/*jslint nomen: true*/
;
'use strict';
/**
 * Class to be used with jsDataQuery in order to format expression for MS SQL SERVER database
 */
(function (_) {
        /** Used as a safe reference for `undefined` in pre-ES5 environments. (thanks lodash)*/
        var undefined;

        /** Used to determine if values are of the language type `Object`. (thanks lodash)*/
        var objectTypes = {
            'function': true,
            'object': true
        };

        if (!Function.prototype.bind) {
            Function.prototype.bind = function (oThis) {
                if (typeof this !== "function") {
                    // closest thing possible to the ECMAScript 5 internal IsCallable function
                    throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
                }

                var aArgs = Array.prototype.slice.call(arguments, 1),
                    fToBind = this,
                    FNOP = function () {
                    },
                    fBound = function () {
                        return fToBind.apply(this instanceof FNOP && oThis ? this : oThis,
                            aArgs.concat(Array.prototype.slice.call(arguments)));
                    };

                FNOP.prototype = this.prototype;
                fBound.prototype = new FNOP();

                return fBound;
            };
        }

        /**
         * Used as a reference to the global object. (thanks lodash)
         *
         * The `this` value is used if it is the global object to avoid Greasemonkey's
         * restricted `window` object, otherwise the `window` object is used.
         */
        var root = (objectTypes[typeof window] && window !== (this && this.window)) ? window : this;

        /** Detect free variable `exports`. (thanks lodash) */
        var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

        /** Detect free variable `module`. (thanks lodash)*/
        var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

        /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. (thanks lodash)*/
        var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
        if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
            root = freeGlobal;
        }

        /** Detect the popular CommonJS extension `module.exports`. Tthanks lodash */
        var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

        /**
         * provides formatting facilities for Microsoft Sql Server query creation
         * @module sqlFormatter
         */

        /**
         * provides formatting facilities for Microsoft Sql Server query creation
         * @class sqlFormatter
         */
        var $sqlf = {};


        /**
         * Check if obj is null or undefined
         * @private
         * @method isNullOrUndefined
         * @param obj
         * @returns {boolean}
         */
        function isNullOrUndefined(obj) {
            return _.isUndefined(obj) || _.isNull(obj);
        }

        /**
         * Check if obj is not a real condition, giving true if it is null, undefined or empty string
         * @method isEmptyCondition
         * @param {sqlFun} cond
         * @returns {boolean}
         */
        function isEmptyCondition(cond) {
            return _.isUndefined(cond) || _.isNull(cond) || cond === '';
        }


        function leftPad(s, n, filler) {
            var o = s.toString();
            while (o.length < n) {
                o = filler + o;
            }
            return o;
        }

        /**
         * Gives the sql string representation of an object
         * @method quote
         * @param v {object} literal constant
         * @param [noSurroundQuotes] if true strings are not surrounded with quotes
         * @returns {string}
         */
        function quote(v, noSurroundQuotes) {
            //should differentiate basing on v type (string / number / date /boolean)
            if (_.isString(v)) {
                if (noSurroundQuotes) {
                    return v.replace(/\'/g, "''");
                }
                return "'" + v.replace(/\'/g, "''") + "'";
            }
            if (_.isNumber(v)) {
                return v.toString();
            }
            if (_.isBoolean(v)) {
                return v.toString();
            }
            if (_.isDate(v)) {
                if (v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0 && v.getMilliseconds() === 0) {
                    return '{d \'' +
                        leftPad(v.getFullYear(), 4, '0') +
                        leftPad(v.getMonth() + 1, 2, '0') + //javascripts counts months starting from 0!!!
                        leftPad(v.getDate(), 2, '0') + '\'}';
                }
                return '{ts \'' +
                    leftPad(v.getFullYear(), 4, '0') + '-' +
                    leftPad(v.getMonth() + 1, 2, '0') + '-' + //javascripts counts months starting from 0!!!
                    leftPad(v.getDate(), 2, '0') + ' ' +
                    leftPad(v.getHours(), 2, '0') + ':' +
                    leftPad(v.getMinutes(), 2, '0') + ':' +
                    leftPad(v.getSeconds(), 2, '0') + '.' +
                    leftPad(v.getMilliseconds(), 3, '0') + '\'}';
            }
            if (isNullOrUndefined(v)) {
                return 'null';
            }
            return v.toString();
        }

        /**
         * Converts a function into a sql expression. The result is meant to be used as conditional expression in
         *  sql WHERE clauses. Usually you will not use this function, but instead you will use the toSql method of
         *  dataquery objects. This can be used to manage slightly more generic objects like null values,
         *  undefined, arrays. Arrays are converted into lists.
         * @method toSql
         * @param {function} v  function to be converted
         * @param {Environment} [environment]  context into which the expression has to be evaluated
         * @return {string}
         * @example eq('a',1) is converted into 'a=1'
         *  eq('a','1') is converted into 'a=\'1\'' i.e. strings are quoted when evaluated
         *  [1,2,3] is converted into (1,2,3)
         */
        function toSql(v, environment) {
            if (isNullOrUndefined(v)) {
                return 'null';
            }
            if (v.toSql) {
                return v.toSql($sqlf, environment);
            }
            if (_.isArray(v)) {
                return '(' +
                    _.map(v, function (el) {
                        return toSql(el, environment);
                    }).join(',') + ')';
            }
            return quote(v);
        }

        /**
         * Get the string filter from a sqlFunction
         * @method conditionToSql
         * @param cond
         * @param environment
         */
        function conditionToSql(cond, environment) {
            if (isEmptyCondition(cond)) {
                return null;
            }
            if (cond.toSql) {
                return cond.toSql($sqlf, environment);
            }
            if (_.isString(cond)) {
                return cond;
            }
            throw 'Illegal parameter passed to conditionToSql:' + JSON.stringify(cond);
        }

        /**
         * Surround expression in parenthesis
         * @method doPar
         * @param expr
         * @returns {string}
         */
        function doPar(expr) {
            return "(" + expr + ")";
        }


        /**
         * get the 'is null' condition over object o
         * @method isNull
         * @param o
         * @returns {string}
         * @example isnull('f') would be converted as 'f is null'
         */
        $sqlf.isNull = function (o, context) {
            return doPar(toSql(o, context) + " is null");
        };

        /**
         * gets the field name eventually prefixed by an alias table name
         * @param field
         * @param [alias]
         * @returns {string}
         * @example field('id','customer') would be converted into 'customer.id',
         *  while field('id') would be converted into 'id'
         */
        $sqlf.field = function (field, alias) {
            if (alias) {
                return alias + '.' + field;
            }
            return field;
        };

        /**
         * gets the 'object are equal' representation for the db
         * @method eq
         * @param a
         * @param b
         * @returns {string}
         */
        $sqlf.eq = function (a, b, context) {
            return doPar(toSql(a, context) + "=" + toSql(b, context));
        };


        /**
         * gets the 'object are not equal' representation for the db
         * @method ne
         * @param a
         * @param b
         * @returns {string}
         */
        $sqlf.ne = function (a, b, context) {
            return doPar(toSql(a, context) + "<>" + toSql(b, context));
        };

        /**
         * gets the 'a > b' representation for the db
         * @method gt
         * @param a
         * @param b
         * @returns {string}
         * @example gt('a','b') would be converted into 'a>b'
         */
        $sqlf.gt = function (a, b, context) {
            return doPar(toSql(a, context) + ">" + toSql(b, context));
        };

        $sqlf.min = function (expr, context) {
            return 'min' + doPar(toSql(expr, context));
        };

        $sqlf.max = function (expr, context) {
            return 'max' + doPar(toSql(expr, context));
        };

//see http://msdn.microsoft.com/it-it/library/ms187748.aspx for details
        /**
         * gets a substring from the expression
         * @method substring
         * @param expr
         * @param {number} start
         * @param {number} len
         * @param context
         * @returns {string}
         */
        $sqlf.substring = function (expr, start, len, context) {
            return 'SUBSTRING' + doPar(toSql([expr, start, len], context));
        };
        /**
         * returns the  first object of the array that is not null
         * @param {string[]} arr
         * @returns {string}
         */
        $sqlf.coalesce = function (arr) {
            return 'coalesce' + doPar(toSql(expr, context));
            doPar(expr.join(','));
        };

        /**
         * Convert an expression into integer
         * @method convertToInt
         * @param expr
         * @param start
         * @return {string}
         */
        $sqlf.convertToInt = function (expr, context) {
            return 'CONVERT(int,' + toSql(expr, context) + ')';
        };

        /**
         * Convert an expression into integer
         * @method convertToInt
         * @param expr
         * @param {number} maxLen
         * @param context
         * @return {string}
         */
        $sqlf.convertToString = function (expr, maxLen, context) {
            return 'CONVERT(varchar(' + maxLen + '),' + toSql(expr, context) + ')';
        };

        /**
         * gets the 'a >= b' representation for the db
         * @method ge
         * @param a
         * @param b
         * @returns {string}
         * @example ge('a','b') would be converted into 'a>=b'
         */
        $sqlf.ge = function (a, b, context) {
            return doPar(toSql(a, context) + ">=" + toSql(b, context));
        };

        /**
         * gets the 'a < b' representation for the db
         * @method lt
         * @param a
         * @param b
         * @returns {string}
         * @example lt('a','b') would be converted into 'a<b'
         */
        $sqlf.lt = function (a, b, context) {
            return doPar(toSql(a, context) + "<" + toSql(b, context));
        };

        /**
         * gets the 'a <= b' representation for the db
         * @method le
         * @param a
         * @param b
         * @returns {string}
         * @example le('a','b') would be converted into 'a<=b'
         */
        $sqlf.le = function (a, b, context) {
            return doPar(toSql(a, context) + "<=" + toSql(b, context));
        };


        /**
         * gets the 'test if Nth bit is set' representation for the db
         * @method bitSet
         * @param a
         * @param b
         * @returns {string}
         * @example bitSet('a','3') would be converted into '(a&(1<<3))<>0'
         */
        $sqlf.bitSet = function (a, b, context) {
            return "((" + toSql(a, context) + "&(1<<" + toSql(b, context) + "))<>0";
        };


        /**
         * gets the 'test if Nth bit is not set' representation for the db
         * @method bitClear
         * @param a
         * @param b
         * @returns {string}
         * @example bitClear('a','3') would be converted into '(a&(1<<3))=0'
         */
        $sqlf.bitClear = function (a, b, context) {
            return "((" + toSql(a, context) + "&(1<<" + toSql(b, context) + "))=0";
        };


        /**
         * gets the 'not expression' representation for the db
         * @method not
         * @param a
         * @returns {string}
         * @example not('a') would be converted into 'not(a)'
         */
        $sqlf.not = function (a, context) {
            return "not" + doPar(toSql(a, context));
        };


        /**
         * gets the 'not expression' representation for the db
         * @method minus
         * @param a
         * @returns {string}
         * @example -('a') would be converted into '-a'
         */
        $sqlf.minus = function (a, context) {
            return "-" + doPar(toSql(a, context));
        };


        /**
         * gets the result of boolean "and" between an array of condition
         * @method joinAnd
         * @param {string[]} arr
         * @returns {string}
         * @example joinAnd(['a','b','c']) would give 'a and b and c'
         */
        $sqlf.joinAnd = function (arr) {
            return doPar(_.filter(arr, function (cond) {
                return !isEmptyCondition(cond);
            }).
                join(" and "));
        };

        /**
         * gets the result of boolean "or" between an array of condition
         *  @method joinOr
         * @param arr
         * @returns {string}
         * @example joinOr(['a','b','c']) would give 'a or b or c'
         */
        $sqlf.joinOr = function (arr) {
            return doPar(_.filter(arr, function (cond) {
                return !isEmptyCondition(cond);
            })
                .join(" or "));
        };


        /**
         * gets the result of the sum of an array of expression
         *  @method add
         * @param arr
         * @returns {string}
         * @example add(['a','b','c']) would give 'a+b+c'
         */
        $sqlf.add = function (arr, context) {
            return doPar(_.map(arr, function (a) {
                return toSql(a, context);
            }).join("+"));
        };

        /**
         * gets the result of the sum of an array of expression
         * @method concat
         * @param arr
         * @returns {string}
         * @example add(['a','b','c']) would give 'a+b+c'
         */
        $sqlf.concat = function (arr, context) {
            return doPar(_.map(arr, function (a) {
                return toSql(a, context);
            }).join("+"));
        };

        /**
         * gets the expression a-b
         * @method sub
         * @param {sqlFun} a
         * @param {sqlFun} b
         * @param context
         * @returns {string}
         */

        $sqlf.sub = function (a, b, context) {
            return doPar([toSql(a, context), toSql(b, context)].join("-"));
        };


        /**
         * gets the expression a/b
         * @method div
         * @param {sqlFun} a
         * @param {sqlFun} b
         * @param context
         * @returns {string}
         */

        $sqlf.div = function (a, b, context) {
            return doPar([toSql(a, context), toSql(b, context)].join("/"));
        };

        $sqlf.sum = function (expr, context) {
            return 'sum' + doPar(toSql(expr, context));
        };


        $sqlf.distinct = function (exprList, context) {
            return 'distinct ' + _.map(exprList, function (expr) {
                    return toSql(expr, context);
                }).join(',');
        };

        /**
         * gets the 'elements belongs to list' sql condition
         * @method isIn
         * @param expr
         * @param list
         * @returns {string}
         * @example isIn('el',[1,2,3,4]) would be compiled into 'el in (1,2,3,4)'
         */
        $sqlf.isIn = function (expr, list, context) {
            return doPar(toSql(expr, context) + " in " + toSql(list, context));
        };


        /**
         * get the '(expr (bitwise and) testMask) equal to val ' sql condition
         * @method testMask
         * @param expr
         * @param mask
         * @param val
         * @returns {string}
         * @example testMask('a',5,1) would give '(a &  5) = 1'
         */
        $sqlf.testMask = function (expr, mask, val, context) {
            return doPar(doPar(toSql(expr, context) + ' & ' + toSql(mask, context)) + '=' + toSql(val, context));
        };

        /**
         * get the 'expr between min and max' sql condition
         * @method between
         * @param expr
         * @param min
         * @param max
         * @returns {string}
         */
        $sqlf.between = function (expr, min, max, context) {
            return doPar(toSql(expr, context) + ' between ' + toSql(min, context) + ' and ' + toSql(max, context));
        };

        /**
         * gets the 'expression like mask' sql condition
         * @method like
         * @param expr
         * @param mask
         * @returns {string}
         */
        $sqlf.like = function (expr, mask, context) {
            return doPar(toSql(expr, context) + ' like ' + toSql(mask, context));
        };

        $sqlf.toSql = toSql;
        $sqlf.quote = quote;
        $sqlf.conditionToSql = conditionToSql;
        $sqlf.isEmptyCondition = isEmptyCondition;

        var charTypes = {
            'text': true,
            'ntext': true,
            'varchar': true,
            'char': true,
            'nvarchar': true,
            'nchar': true,
            'sysname': true
        };

        var intTypes = {
            'tinyint': true,
            'smallint': true,
            'int': true,
            'bigint': true
        };

        var floatTypes = {
            'real': true,
            'money': true,
            'float': true,
            'decimal': true,
            'numeric': true,
            'smallmoney': true
        };


        /**
         * Get object from a string, assuming that the strings represents a given sql type
         * @param {string} s
         * @param sqlType
         */
        function getObject(s, sqlType) {
            if (charTypes[sqlType]) {
                return s;
            }
            if (intTypes[sqlType]) {
                return parseInt(s, 10);
            }
            if (floatTypes[sqlType]) {
                return parseFloat(s);
            }

            return s;
        }

        $sqlf.getObject = getObject;

        // Some AMD build optimizers like r.js check for condition patterns like the following:
        if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
            // Expose lodash to the global object when an AMD loader is present to avoid
            // errors in cases where lodash is loaded by a script tag and not intended
            // as an AMD module. See http://requirejs.org/docs/errors.html#mismatch for
            // more details.
            root.jsDataQuery = dataQuery;

            // Define as an anonymous module so, through path mapping, it can be
            // referenced as the "underscore" module.
            define(function () {
                return dataQuery;
            });
        }
        // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
        else if (freeExports && freeModule) {
            // Export for Node.js or RingoJS.
            if (moduleExports) {
                (freeModule.exports = $sqlf).sqlServerFormatter = $sqlf;
            }
            // Export for Narwhal or Rhino -require.
            else {
                freeExports.sqlServerFormatter = $sqlf;
            }
        }
        else {
            // Export for a browser or Rhino.
            root.sqlServerFormatter = $sqlf;
        }
    }.call(this,
        (typeof _ === 'undefined') ? require('lodash') : _
    )
);

