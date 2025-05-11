export{}
for(let i = 0; i < 10; i++){
        let foo = 1;
    foo = 2;
    const bar = foo + 3;

    function test1(x: number): number {
    return foo * x;
    }
    console.log(foo);

}
for(let i = 0; i < 10; i++){
    let foo = 0;
    foo = 0;
    const bar = foo + 0;

    function test1(x: number): number {
    return foo * x;
    }
    console.log(foo);
}

