

var fuck = {};

fuck.you = {};

var you = [
    'a1',
    'a2',
    'a3'
];


fuck.you.__defineGetter__(you[0], function(){
    return 'fuck';
});

fuck.you.__defineGetter__(you[1], function(){
    return 'hell';
});

console.log(you);
console.log(fuck);

console.log(fuck.you['a2']);