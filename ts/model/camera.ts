import {Quaternion} from '../math/quaternion';
import {Vec3} from '../math/vec3';
import {Mat4} from '../math/mat4';

export class Camera {
    protected pos: Vec3;
    protected forward: Vec3;
    protected up: Vec3;
    protected right: Vec3;

    private viewMatrix: Mat4;
    private viewMatrixDirty: boolean;

    constructor(
        pos: Vec3,
        lookAt: Vec3,
        up: Vec3
    ) {
        this.pos = pos.clone();
        this.forward = lookAt.sub(pos).normal();
        this.up = up.normal();
        this.right = Vec3.cross(this.forward, this.up).setNormal();

        this.viewMatrix = new Mat4();
        this.viewMatrixDirty = true;
    }

    public getViewMatrix(): Mat4 {
        if (this.viewMatrixDirty) {
            this.viewMatrix.setLookAt(this.pos, this.pos.add(this.forward), this.up);
            this.viewMatrixDirty = false;
        }

        return this.viewMatrix;
    }

    public getPosition(): Vec3 {
        return this.pos.clone();
    }

    public moveForward(distance: number) {
        this.pos.setAdd(this.forward.scale(distance));
        this.viewMatrixDirty = true;
    }

    public moveRight(distance: number) {
        this.pos.setAdd(this.right.scale(distance));
        this.viewMatrixDirty = true;
    }

    public moveUp(distance: number) {
        this.pos.setAdd(this.up.scale(distance));
        this.viewMatrixDirty = true;
    }

    public rotateRight(angle: number) {
        let rotation = Quaternion.fromAxisAngle(this.up, -angle);
        this.forward = Quaternion.rotateVec3(rotation, this.forward).setNormal();
        this.right = Vec3.cross(this.forward, this.up).setNormal();
        this.viewMatrixDirty = true;
    }

    public rotateUp(angle: number) {
        let rotation = Quaternion.fromAxisAngle(this.right, angle);
        this.forward = Quaternion.rotateVec3(rotation, this.forward);
        this.right = Vec3.cross(this.forward, this.up).setNormal();
        this.viewMatrixDirty = true;
    }
}