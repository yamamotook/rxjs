# 操作符的基础

Rx中的操作符是一个会返回Observable对象的函数.
Rx中的操作符类似于数组中的map, filter,reduce...等函数.
```js
    const arr = [1,2,3,4];
    const result = arr.map(i => i * 2)
                        .filter(i => i % 2 === 0);
    console.log(result); // [4,8]
```
只不过在Rx中, 操作符操作的是Observable.
可以将操作符按以下类被进行分类:
+ 创建类（creation）
    创建类操作符一般都是数据的源头,作为起点,没有上游.
+ 转化类（transformation）
    例如像map操作符就属于转化类.将输入的Observable转化之后输出到下游.
+ 过滤类（filtering）
    例如像filter操作符就属于过滤类, 将输入的Observable过滤筛选之后,输出满足要求的Observable到下游.
+ 合并类（combination）
    用于将多个Observable合并到一个Observable对象中.
+ 多播类（multicasting）
    当一个Observable对象被多个Observer订阅时, 一个数据需要通过多个订阅者,就是多播.
+ 错误处理类（error Handling）
    当Observable发生异常时的处理.
+ 辅助⼯具类（utility）
+ 数学和合计类（mathmatical&aggregate）

## 操作符的实现
不管是哪一个操作符,都要需要考虑以下几点:
+ 返回一个Observable
+ 对上游的Observable订阅和退订.
+ 处理异常情况
+ 及时释放资源

实现map操作符
```js
        //YY的调用方式 : Rx.Observable.of(1,2,3).myMap(i => i * 2).subscribe(console.log)
        function myMap(project){
            //返回一个全新的Observable
            return new Rx.Observable(observer => {
                //订阅上游的observable
                //因为是链式调用,所以这里的this,肯定是上游的Observable
                const subscription = this.subscribe(item=>{
                    //处理异常情况
                    //对于异常情况应该告知交由observer来处理
                    try{
                        observer.next(project(item))
                    }catch(e){
                        observer.error(e);
                    }
                },
                err => observer.error(err),
                () => observer.complete()
                );
                //当下游的observable退订当前observable时, 需要去退订上游的observable
                return {
                    unsubscribe : ()=>{
                        subscription.unsubscribe();
                    }
                }
            });
        }
```

关联操作符
```js 
    Rx.Observable.prototype.myMap = myMap
```
通过原型挂载的操作符可以在所有的Observable对象上使用;
有的时候我们希望某个操作符只会在指定的Observable上使用可以怎么办:
```js
//对于指定的Observable: source$进行绑定
myMap.bind(source$)(i => i * 2)
//对于bind 可以使用 ::语法糖进行绑定
//::目前并不是ES6语法, 目前为止浏览器也并不支持::语法.
//不过使用babel可以将::转换为bind
source$::myMap(i => i * 2)::myMap(i => i + 1);
Promise.resolve(123).then(::console.log);
```
[关于::绑定操作符](https://github.com/tc39/proposal-bind-operator)

### 使用lift实现操作符
```js
        function myFilter(project){
            //lift(意为提升), 会返回一个Observable对象
            return this.lift(function (source$){
                //当lift返回的observable被订阅时,会执行传入lift的方法;
                //传入lift的方法中, this代表observer, source$代表上游的observable
                return source$.subscribe(item => {
                    try{
                        if(project(item)){
                            this.next(item);
                        }
                    }catch(err){
                        this.error(err)
                    }
                },
                err => this.error(err),
                () => this.complete()
                )                
            });
        }
```
虽然RxJS v5的操作符都架构在lift上，应⽤层开发者并不经常使⽤lift，这个lift更多的是给RxJS库开发者使⽤。

## 关于Rxjs的引入方式
你可以简单粗暴的使用 或者 通过cdn引入rxjs
```js
import Rx from 'rxjs'
//或者
const Rx = require('rxjs')
```
但是这样做会造成打包后的文件过大并且充斥着很多无用代码.


### 引入打补丁的方式
打补丁的方式其实就是在Observable的原型上挂载操作符.
这样的方式会造成几个问题:

* 通过打补丁的方式引入操作符, 每一个文件模块都会使用全局的那个Observable, 也就是说如果你在A文件中引入了map操作符, 那么你在B文件中也可以直接使用操作符,而不需要导入.如果有一天在A文件中移除了map操作符的引用, 那么B文件可能就会无法正常运行. 在代码中我们应该尽量避免操作全局资源.
* 通过打补丁的方式引入操作符,打包时无法进行Tree-Shaking, 也就是说无论你是否使用了这个操作符, 只要你引入了,那么就会随之一起打包进去.因为Tree-Shaking是静态分析, 只要产生了引用,那么就会被打包到最终的文件当中.
* pipeable操作符也很香
```js
//打补丁的方式引入操作符
import from 'rxjs/add/operator/map';
import from 'rxjs/add/operator/filter';
//或者是
require('rxjs/add/operator/map')
require('rxjs/add/operator/filter')
```

### 引入不打补丁的方式
对于操作符可以使用`bind`或者`call`方法来让某个操作符只对一个具体的Observable生效.
对于静态操作符,直接使用即可.
```js
//不使用打补丁的方式,引入方式也发生了改变
//同样是引入操作符map和filter
import {Observable} from 'rxjs/Observable';
//以前的静态操作符都是在 rxjs/add/observable下面
import {of} from 'rxjs/observable/of';
//以前的操作符都是在 rx/add/operator下面
import {map} from 'rxjs/operator/map';
import {filter} from 'rxjs/operator/filter';
```
通过这种方式引入的操作符目前和Observable之间还没有任何联系, 每一个操作符都是独立的.
```js
const source$ = of(1,2,3);
//通过bind将操作符和Observable进行关联
source$::map(i => i*2)
```
就避免了Observable被污染的问题，这是开发库函数的通⽤做法。

如果查看文件 ```rxjs/add/operator/filter```可以看到实现方法很简单, 引入Observable构造函数, 并在构造函数的原型上挂载了操作符.
```js
"use strict";
var Observable_1 = require('../../Observable');
var filter_1 = require('../../operator/filter');
Observable_1.Observable.prototype.filter = filter_1.filter;
```
### lettable/pipeable操作符
在上面的操作符实现的过程中, 函数内出现了this,用于获取上游的Observable对象.这样操作this的函数可不能被称之为一个纯函数,因为纯函数的输出结果只能由输入的参数决定.为了加以改进,出现了let操作符.

let操作符是的简单使用:
```js
const { Observable } = require('rxjs/Observable');
require('rxjs/add/operator/map');
//可以看到let操作符的引用还是以打补丁的方式引入.
//所以才出现了后面的pipe操作符来弥补这个问题.
require('rxjs/add/operator/let')

//简单的let操作符使用方法
//注意这里的map还是普通的map操作符(因为是从:rxjs/add/operator/map引入),而并不支持pipeable
const double$ = source => source.map(i => i * 2);
//let操作符会接受一个函数, 这个函数的参数会是上游的Observable, 并且返回一个新的Observable给下游订阅
source$.let(double$).subscribe(console.log);
```
let操作符会接受一个函数, 这个函数的参数会是上游的Observable, 并且返回一个新的Observable.当let被调用时,实际上是把上游的Observable对象作为参数传递给source, 然后返回一个新的Observable对象给下游订阅.


**需要注意的是通过打补丁方式(rxjs/add/operator)引入的操作符并不支持pipeable, 他们只适用于链式调用**
**需要注意的是通过打补丁方式(rxjs/add/operator)引入的操作符并不支持pipeable,他们只适用于链式调用**
**需要注意的是通过打补丁方式(rxjs/add/operator)引入的操作符并不支持pipeable,他们只适用于链式调用**

支持pipeable操作符map的实现:
```js
function pipeableMap(project){
    //因为let操作符需要接受一个函数, 所以这里立刻返回一个函数.
    return function(source){  
        //let操作符会将上游的Observable作为函数的参数传进来.
        //let操作符接受的函数需要返回一个新的Observable, 所以这里要返回一个新的Observable
        return new Observable( observer =>{
            //这里的Observable是用于给下游订阅的.当下游被subscribe时,会将observer传入这个Observable
            //当下游订阅了该Observable时,需要立刻去订阅上游的Observable,并返回unsubscribe
            return source.subscribe(value => {
                //接受到上游的数据value
                try{
                    //传递给下游
                    observer.next(project(value))
                }catch(e){
                    observer.error(e)
                }
            },
            err => observer.error(err),
            () => observer.complete()
            )
        });
    }
}
source$.let( pipeableMap( i => i * 2) ).subscribe(console.log)
```
使用官方的pipeable map
```js
const { map} = require('rxjs/operators/map')
source$.let( map( i => i * 2) ).subscribe(console.log)
```
支持pipeable的操作符位于 `rxjs/operators`(注意operators是复数)目录下.

利用ES6简写pipeable map
```js
//利用es6还可以简写pipleMap
const shortPipeMap = project => source => new Observable(observer =>
    source.subscribe(
      (value) => {
        //接受到上游的数据value
        try {
          //传递给下游
          observer.next(project(value));
        } catch (e) {
          observer.error(e);
        }
      },
      (err) => observer.error(err),
      () => observer.complete()
    )
  );
```
## 使用pipe
⼤部分操作符都有pipeable操作符实现，注意是“⼤部分”⽽不是全部，这是因为：
+ 静态类型操作符没有pipeable操作符的对应形式。
+ 拥有多个上游Observable对象的操作符没有pipeable操作符的对应形式。
+ 
pipe不只是具备let的功能，还有“管道”功能，可以把多个lettable操作符串接起来，形成数据管道。
使用pipe操作符, 任何一个Observable对象都实现了pipe, 所以pipe 是 Observable 的一部分，不需要导入，并且它可以替代现有的 let 操作符。
```js
//使用pipe操作符
source$.pipe(  filter(i => i % 2 === 0), map(i => i*2) ).subscribe(console.log)
```
重命名的操作符

由于操作符要从 Observable 中独立出来，所以操作符的名称不能和 JavaScript 的关键字冲突。因此一些操作符的 pipeable 版本的名称做出了修改。这些操作符是:

do -> tap
catch -> catchError
switch -> switchAll
finally -> finalize

