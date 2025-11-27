export {};
function add(a:number, b:number) {
    return a + b;
}

add(10,9);

let a = 10;
let b = 10;


for(let i = 0;i < 10;i++){
    add(i,i)
}
if(a>0){
    a += 1;
    add(a,b)
    b
}else{
    b -= 2;
    add(a,b)
    a
}