export class Color {
    public data: Float32Array;

    constructor(
        r: number = 0,
        b: number = 0,
        g: number = 0,
        a: number = 1
    ) {
        this.data = new Float32Array([r, g, b, a]);
    }

    public r() { return this.data[0]; }
    public g() { return this.data[1]; }
    public b() { return this.data[2]; }
    public a() { return this.data[3]; }

    // Constants
    public static WHITE = new Color(1, 1, 1, 1);
    public static AL_INDIGO = new Color(64/255, 52/255, 139/255, 1);
}