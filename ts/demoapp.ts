class Demo {
    constructor() {}

    public CreateAndStart(canvas: HTMLCanvasElement) {
        alert('You did it!');
    }
};

const DemoApp: Demo = new Demo();



DemoApp.CreateAndStart(document.getElementById('demo-surface') as HTMLCanvasElement);