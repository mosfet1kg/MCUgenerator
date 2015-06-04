var nStart = new Date().getTime();      //시작시간 체크(단위 ms)

//.......... 처리 로직 ..............
//.......... 처리 로직 ..............
//.......... 처리 로직 ..............
var nEnd =  new Date().getTime();      //종료시간 체크(단위 ms)

var nDiff = nEnd - nStart;      //두 시간차 계산(단위 ms)

console.log(nDiff);