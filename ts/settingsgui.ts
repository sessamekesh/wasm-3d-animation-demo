export type SystemType = 'JavaScript'|'WebAssembly';

class GUIValues {
    public get System() { return this._System; }
    public set System(value) { this.OnSystemChange.forEach(f=>f(value)); this._System = value; }
    private _System: SystemType;
    public OnSystemChange: ((type: SystemType)=>any)[] = [];

    public get NumRunners() { return this._NumRunners; }
    public set NumRunners(value) { this.OnNumRunnersChange.forEach(f=>f(value)); this._NumRunners = value; }
    private _NumRunners: number;
    public OnNumRunnersChange: ((num: number)=>any)[] = [];

    constructor () {
        this._System = 'JavaScript';
        this._NumRunners = 8;
    }
};

export class GUI {
    private gui: dat.GUI = new dat.GUI();
    public values: GUIValues = new GUIValues();
    constructor() {
        this.gui.add(this.values, 'System', ['JavaScript', 'WebAssembly']);
        this.gui.add(this.values, 'NumRunners').min(0).step(1);
    }
}