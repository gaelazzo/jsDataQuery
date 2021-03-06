# jsDataQuery
Query functions convertable into sql expressions

Yuidoc documents available [here](http://gaelazzo.github.io/jsDataQuery/)

jsDataQuery allow building sql expression {*sqlFun*} that can be applied to javascript objects. Then it is possible to convert that expression into a sql-readable string, simply invoking the toSql method of the object.

**toSql** method is not specific to a single database provider, infact it must be supplied from the external.
So it's possible to query any kind of database with the same {*sqlFun*}, provided that when the function will be applied to a specific database, the formatter for it will be provided.
So you don't have to care of specific sql-dialect when building  query. More, the same query will be also appliable to javascript objects.

For example,

    it('comparing values through field not equal', function () {
      var 	x = {a: 1, b: 2, c: 3},
    		f = $q.eq($q.field('a'), 2);
      expect(f(x)).toBeFalsy();
      x.a=2;
      expect(f(x)).toBeTruthy();
    });
    

sqlFun are also higly optimized so that if the engine detects they are simplifiable, they will be treathed as constant and not submitted in their original form:

    it('and of false function with other function should be the always false function', 	function(){
      		var xx = {a: 'AABBCC', q: '1'},
    			cond1 = $q.like('a', 'AAB_CC'),
    			cond2 = $q.eq('q', 1),
    			cond3 = $q.constant(false),
    		f = $q.and(cond1, cond2, cond3);
      		expect(f.isFalse).toBe(true);
    	});
Notice that f.isFalse is a property of the function, not the result of applying the function to a particolar argument. The engine has detected that f is a constant function.    

If some parts of an expression are undefined, the expression may still be successfull evalued:

     it('and of a series of function including one undefined and one dinamically-false gives false', function () {
      	var xx = {a: 'AABBCC', q: '1'},
    		f = $q.and($q.like('a', 'AAB_CC'), $q.eq('q', 2), undefined);
      		expect(f(xx)).toBe(false);
    });

In this case f(xx) is false because xx['q']!== 2 so and-ing the value qith the the other function will be false, no matter if some of them are undefined.

For easy of using, many operator are "auto-fielded" in the first operand.
For example, normally if you write

`$q.eq('a',2)` 

it would mean "give me the function that compares the character constant 'a' whith 2".
But the first operand is "auto-fielded" so it is normally assumed, when it is a character constant, to be the name of an identifier. So it is interpreted as:
"give me the function that compares the field named 'a' with 2"
I.E. it is threated as the equivalent of

`$q.eq($q.field('a'),2)`

  
where $q.field(x) is the function that applied to an object will return the field of that object named x:

     it('comparing values through field equal', function () {
      var 	x = {a: 1, b: 2, c: 3},
    		f = $q.eq($q.field('a'), 1);
			g = $q.eq('a', 1);
      	expect(f(x)).toBeTruthy();
      	expect(g(x)).toBeTruthy();
      	x.a=2;
      	expect(f(x)).toBeFalsy();
      	expect(g(x)).toBeFalsy();
    });

Here f and g are the function that compares the field named 'a' of the argument with the constant 1.


![](https://travis-ci.org/gaelazzo/jsDataQuery.svg?branch=master)     
