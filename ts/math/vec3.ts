export class Vec3 {

    public data: Float32Array;

    constructor(
        x: number = 0,
        y: number = 0,
        z: number = 0
    ) {
        this.data = new Float32Array([x, y, z]);
    }

    public x(): number { return this.data[0]; }
    public y(): number { return this.data[1]; }
    public z(): number { return this.data[2]; }

    public setX(x: number): Vec3 { this.data[0] = x; return this; }
    public setY(y: number): Vec3 { this.data[1] = y; return this; }
    public setZ(z: number): Vec3 { this.data[2] = z; return this; }

    public clone(): Vec3 { return new Vec3(this.data[0], this.data[1], this.data[2]); }

    public sqLength(): number { return this.x() ** 2 + this.y() ** 2 + this.z() ** 2; }
    public length(): number { return Math.sqrt(this.sqLength()); }

    
    public scale(scale: number) { return this.clone().setScale(scale); }
    public normal(): Vec3 { return this.clone().setNormal(); }

    public setNormal(): Vec3 {
        let mag = this.length();
        this.data[0] /= mag;
        this.data[1] /= mag;
        this.data[2] /= mag;
        return this;
    }
    public setScale(scale: number) {
        this.data[0] *= scale;
        this.data[1] *= scale;
        this.data[2] *= scale;
        return this;
    }

    public static dot(a: Vec3, b: Vec3) {
        return a.data[0] * b.data[0] + a.data[1] * b.data[1] + a.data[2] * b.data[2];
    }

    public static cross(a: Vec3, b: Vec3) {
        return new Vec3(
            a.data[1] * b.data[2] - a.data[2] * b.data[1],
            a.data[2] * b.data[0] - a.data[0] * b.data[2],
            a.data[0] * b.data[1] - a.data[1] * b.data[0]
        );
    }

    public static lerp(a: Vec3, b: Vec3, t: number) {
        return new Vec3(
            a.data[0] * (1 - t) + b.data[0] * t,
            a.data[1] * (1 - t) + b.data[1] * t,
            a.data[2] * (1 - t) + b.data[2] * t
        )
    }

    public sub(origin: Vec3): Vec3 {
        return new Vec3(
            this.x() - origin.x(),
            this.y() - origin.y(),
            this.z() - origin.z()
        );
    }

    public add(b: Vec3): Vec3 {
        return new Vec3(
            this.x() + b.x(),
            this.y() + b.y(),
            this.z() + b.z()
        );
    }

    public setAdd(b: Vec3): Vec3 {
        this.data[0] += b.x();
        this.data[1] += b.y();
        this.data[2] += b.z();
        return this;
    }

    public static UNIT_X = new Vec3(1, 0, 0);
    public static UNIT_Y = new Vec3(0, 1, 0);
    public static UNIT_Z = new Vec3(0, 0, 1);
    public static ZEROS = new Vec3(0, 0, 0);
    public static ONES = new Vec3(1, 1, 1);
};
