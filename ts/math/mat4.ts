import {Quaternion} from './quaternion';
import {Vec3} from './vec3';

export class Mat4 {
    public data: Float32Array;

    constructor() {
        this.data = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    public setElements(
        m11: number, m12: number, m13: number, m14: number,
        m21: number, m22: number, m23: number, m24: number,
        m31: number, m32: number, m33: number, m34: number,
        m41: number, m42: number, m43: number, m44: number
    ): Mat4 {
        this.data[ 0] = m11;
        this.data[ 1] = m12;
        this.data[ 2] = m13;
        this.data[ 3] = m14;

        this.data[ 4] = m21;
        this.data[ 5] = m22;
        this.data[ 6] = m23;
        this.data[ 7] = m24;

        this.data[ 8] = m31;
        this.data[ 9] = m32;
        this.data[10] = m33;
        this.data[11] = m34;

        this.data[12] = m41;
        this.data[13] = m42;
        this.data[14] = m43;
        this.data[15] = m44;

        return this;
    }

    public clone(): Mat4 {
        return new Mat4().setElements(
            this.data[ 0], this.data[ 1], this.data[ 2], this.data[ 3],
            this.data[ 4], this.data[ 5], this.data[ 6], this.data[ 7],
            this.data[ 8], this.data[ 9], this.data[10], this.data[11],
            this.data[12], this.data[13], this.data[14], this.data[15]
        );
    }

    // Also from gl-matrix
    // https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/mat4.js
    public setRotationTranslationScale(rotation: Quaternion, translation: Vec3, scale: Vec3): Mat4 {
        // Quaternion math
        let x = rotation.data[0], y = rotation.data[1], z = rotation.data[2], w = rotation.data[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2,
            sx = scale.data[0],
            sy = scale.data[1],
            sz = scale.data[2];

        this.data[ 0] = (1 - (yy + zz)) * sx;
        this.data[ 1] = (xy + wz) * sx;
        this.data[ 2] = (xz - wy) * sx;
        this.data[ 3] = 0;
        this.data[ 4] = (xy - wz) * sy;
        this.data[ 5] = (1 - (xx + zz)) * sy;
        this.data[ 6] = (yz + wx) * sy;
        this.data[ 7] = 0;
        this.data[ 8] = (xz + wy) * sz;
        this.data[ 9] = (yz - wx) * sz;
        this.data[10] = (1 - (xx + yy)) * sz;
        this.data[11] = 0;
        this.data[12] = translation.data[0];
        this.data[13] = translation.data[1];
        this.data[14] = translation.data[2];
        this.data[15] = 1;

        return this;
    }

    public perspective(fovy: number, aspect: number, nearZ: number, farZ: number): Mat4 {
        let f = 1 / Math.tan(fovy / 2);
        let nf = 1 / (nearZ - farZ);
        return new Mat4().setElements(
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (farZ + nearZ) * nf, -1,
            0, 0, 2  * farZ * nearZ * nf, 0
        );
    }

    public setLookAt(eye: Vec3, center: Vec3, up: Vec3) {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
            eyex = eye.x(),
            eyey = eye.y(),
            eyez = eye.z(),
            upx = up.x(),
            upy = up.y(),
            upz = up.z(),
            centerx = center.x(),
            centery = center.y(),
            centerz = center.z();
        
        if (Math.abs(eyex - centerx) < 0.001 &&
            Math.abs(eyey - centery) < 0.001 &&
            Math.abs(eyez - centerz) < 0.001) {
            return new Mat4();
        }

        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        return this.setElements(
            x0, y0, z0, 0,
            x1, y1, z1, 0,
            x2, y2, z2, 0,

            -(x0 * eyex + x1 * eyey + x2 * eyez),
            -(y0 * eyex + y1 * eyey + y2 * eyez),
            -(z0 * eyex + z1 * eyey + z2 * eyez),
            1
        );
    }

    public static inverse(mat: Mat4): Mat4|null {
        let a00 = mat.data[0], a01 = mat.data[1], a02 = mat.data[2], a03 = mat.data[3],
            a10 = mat.data[4], a11 = mat.data[5], a12 = mat.data[6], a13 = mat.data[7],
            a20 = mat.data[8], a21 = mat.data[9], a22 = mat.data[10], a23 = mat.data[11],
            a30 = mat.data[12], a31 = mat.data[13], a32 = mat.data[14], a33 = mat.data[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            // Calculate the determinant
            det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        return new Mat4().setElements(
            (a11 * b11 - a12 * b10 + a13 * b09) * det,
            (a02 * b10 - a01 * b11 - a03 * b09) * det,
            (a31 * b05 - a32 * b04 + a33 * b03) * det,
            (a22 * b04 - a21 * b05 - a23 * b03) * det,
            (a12 * b08 - a10 * b11 - a13 * b07) * det,
            (a00 * b11 - a02 * b08 + a03 * b07) * det,
            (a32 * b02 - a30 * b05 - a33 * b01) * det,
            (a20 * b05 - a22 * b02 + a23 * b01) * det,
            (a10 * b10 - a11 * b08 + a13 * b06) * det,
            (a01 * b08 - a00 * b10 - a03 * b06) * det,
            (a30 * b04 - a31 * b02 + a33 * b00) * det,
            (a21 * b02 - a20 * b04 - a23 * b00) * det,
            (a11 * b07 - a10 * b09 - a12 * b06) * det,
            (a00 * b09 - a01 * b07 + a02 * b06) * det,
            (a31 * b01 - a30 * b03 - a32 * b00) * det,
            (a20 * b03 - a21 * b01 + a22 * b00) * det
        );
    }

    public static mul(a: Mat4, b: Mat4): Mat4 {
        let tr = new Mat4();

        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                tr.data[row * 4 + col] = 0;
                for (let k = 0; k < 4; k++) {
                    tr.data[row * 4 + col] += b.data[row * 4 + k] * a.data[k * 4 + col];
                }
            }
        }

        return tr;
    }
}

export const IDENTITY: Mat4 = new Mat4();