const { Observable } = require("rxjs/Observable");

require("rxjs/add/operator/map");
require("rxjs/add/observable/of");
require("rxjs/add/operator/let");

const source$ = Observable.of(1, 2, 3, 4, 5);

console.log("使用let操作符:配合打补丁map");
//简单的let操作符使用方法
//注意这里的map还是普通的map操作符(因为是从:rxjs/add/operator/map引入),而并不支持pipeable
const double$ = (source) => source.map((i) => i * 2);
//let操作符会接受一个函数, 这个函数的参数会是上游的Observable, 并且返回一个新的Observable给下游订阅
source$.let(double$).subscribe(console.log);

console.log("实现支持pipeable的map:");
//实现支持pipeable的map
function pipeableMap(project) {
  //因为let操作符需要接受一个函数, 所以这里立刻返回一个函数.
  return function (source) {
    //let操作符会将上游的Observable作为函数的参数传进来.
    //let操作符接受的函数需要返回一个新的Observable, 所以这里要返回一个新的Observable
    return new Observable((observer) => {
      //这里的Observable是用于给下游订阅的.当下游被subscribe时,会将observer传入这个Observable
      //当下游订阅了该Observable时,需要立刻去订阅上游的Observable,并返回unsubscribe
      return source.subscribe(
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
      );
    });
  };
}
source$.let(pipeableMap((i) => i * 2)).subscribe(console.log);

console.log("使用官方的pipeable map");
const { map } = require("rxjs/operators/map");
const { filter } = require("rxjs/operators");
source$.let(map((i) => i * 2)).subscribe(console.log);

console.log("使用简写的pipeable map");
//利用es6还可以简写pipleMap
const shortPipeMap = (project) => (source) =>
  new Observable((observer) =>
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
  source$.let(shortPipeMap((i) => i * 2)).subscribe(console.log);

    console.log('使用piee操作符')
//使用pipe操作符
source$.pipe(  filter(i => i % 2 === 0), map(i => i*2) ).subscribe(console.log)