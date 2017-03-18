import {Vec3} from './vec3';

export class Quaternion {
    public data: Float32Array;
    constructor(
        x: number = 0,
        y: number = 0,
        z: number = 0,
        w: number = 1
    ) {
        this.data = new Float32Array([x, y, z, w]);
    }

    public static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
        let cos2 = Math.cos(angle / 2);
        let sin2 = Math.sin(angle / 2);

        return new Quaternion(
            sin2 * axis.x(),
            sin2 * axis.y(),
            sin2 * axis.z(),
            cos2
        ).setNormal();
    }

    public x() { return this.data[0]; }
    public y() { return this.data[1]; }
    public z() { return this.data[2]; }
    public w() { return this.data[3]; }

    public setNormal(): Quaternion {
        let mag = Math.sqrt(this.data[0] ** 2 + this.data[1] ** 2 + this.data[2] ** 2 + this.data[3] ** 2);
        this.data[0] /= mag;
        this.data[1] /= mag;
        this.data[2] /= mag;
        this.data[3] /= mag;
        return this;
    }

    public normal(): Quaternion {
        return this.clone().setNormal();
    }

    public clone(): Quaternion {
        return new Quaternion(this.data[0], this.data[1], this.data[2], this.data[3]);
    }

    /**
     * Perform a spherical interpolation between two quaternions
     * https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @param {number} t between 0 and 1
     */
    public static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
        let ax = a.data[0], ay = a.data[1], az = a.data[2], aw = a.data[3];
        let bx = b.data[0], by = b.data[1], bz = b.data[2], bw = b.data[3];

        let omega, cosom, sinom, scale0, scale1;
        // calc cosine
        cosom = ax * bx + ay * by + az * bz + aw * bw;
        // adjust signs (if necessary)
        if ( cosom < 0.0 ) {
            cosom = -cosom;
            bx = - bx;
            by = - by;
            bz = - bz;
            bw = - bw;
        }
        // calculate coefficients
        if ( (1.0 - cosom) > 0.000001 ) {
            // standard case (slerp)
            omega  = Math.acos(cosom);
            sinom  = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {        
            // "from" and "to" quaternions are very close 
            //  ... so we can do a linear interpolation
            scale0 = 1.0 - t;
            scale1 = t;
        }

        // calculate final values
        return new Quaternion(
            scale0 * ax + scale1 * bx,
            scale0 * ay + scale1 * by,
            scale0 * az + scale1 * bz,
            scale0 * aw + scale1 * bw
        );
    }

    /**
     * Also taken from the gl-matrix library
     * https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
     */
    public static multiply(a: Quaternion, b: Quaternion): Quaternion {
        let ax = a.data[0], ay = a.data[1], az = a.data[2], aw = a.data[3];
        let bx = b.data[0], by = b.data[1], bz = b.data[2], bw = b.data[3];
        return new Quaternion(
            ax * bw + aw * bx + ay * bz - az * by,
            ay * bw + aw * by + az * bx - ax * bz,
            az * bw + aw * bz + ax * by - ay * bx,
            aw * bw - ax * bx - ay * by - az * bz
        );
    }

    public static rotateVec3(q: Quaternion, v: Vec3) {
        let u = new Vec3(q.x(), q.y(), q.z());
        let s = q.w();

        return u.scale(2 * Vec3.dot(u, v))
            .setAdd(v.scale(s * s - Vec3.dot(u, u)))
            .setAdd(Vec3.cross(u, v).setScale(2 * s));
    }
}