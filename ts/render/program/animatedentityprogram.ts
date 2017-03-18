import {Color} from '../../math/color';
import {Mat4} from '../../math/mat4'
import {Vec3} from '../../math/vec3';
import {DirectionalLight} from '../directionallight';
import {Material} from '../material';

let MAX_BONES_PER_MESH = 60;

export class AnimatedEntityVertex {
    constructor (
        public pos: Vec3,
        public normal: Vec3,
        public boneWeights: [number, number, number, number],
        public boneIndices: [number, number, number, number]
    ) {}
}

export class ModelData {
    constructor (
        public material: Material,
        public vertices: AnimatedEntityVertex[],
        public indices: Uint16Array,
        public boneNames: string[],
        public boneOffsets: Mat4[]
    ) {
        this.gl = null;
        this.vb = null;
        this.ib = null;
    }

    private gl: WebGLRenderingContext|null;
    public vb: WebGLBuffer|null;
    public ib: WebGLBuffer|null;

    public prepare(gl: WebGLRenderingContext) {
        if (this.gl != gl) {
            if (this.vb) gl.deleteBuffer(this.vb);
            if (this.ib) gl.deleteBuffer(this.ib);

            let vertStride = (
                Float32Array.BYTES_PER_ELEMENT * 3 // pos
                + Float32Array.BYTES_PER_ELEMENT * 3 // normal
                + Float32Array.BYTES_PER_ELEMENT * 4 // bone weights
                + Uint8Array.BYTES_PER_ELEMENT * 4 // bone indices
            );

            let verts = new ArrayBuffer(this.vertices.length * vertStride);
            let floatView = new Float32Array(verts);
            let uintView = new Uint8Array(verts);

            for (let i = 0; i < this.vertices.length; i++) {
                let vert = this.vertices[i];

                let posIdx = i * vertStride / Float32Array.BYTES_PER_ELEMENT;
                let normIdx  = i * vertStride / Float32Array.BYTES_PER_ELEMENT + 3;
                let weightIdx = i * vertStride / Float32Array.BYTES_PER_ELEMENT + 6;
                let idxIdx = i * vertStride + Float32Array.BYTES_PER_ELEMENT * 10;

                floatView.set(vert.pos.data, posIdx);
                floatView.set(vert.normal.data, normIdx);
                floatView.set(vert.boneWeights, weightIdx);
                uintView.set(vert.boneIndices, idxIdx);
            }

            this.vb = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

            this.ib = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

            this.gl = gl;
        }
    }
}

export class AnimatedEntityRenderCall {
    constructor (
        public modelData: ModelData,
        public worldTransform: Mat4
    ) {}
}

/**
 * GLSL vertex shader code
 */
let vsText = `
// Thank you for this excellent coverage of animation, toji!
// https://github.com/toji/building-the-game/blob/part-3/public/js/skinned-model.js
precision mediump float;

uniform mat4 mModel;
uniform mat4 mView;
uniform mat4 mProj;
uniform mat4 boneMat[${MAX_BONES_PER_MESH}];

attribute vec3 vPos;
attribute vec3 vNorm;
attribute vec4 vWeights;
attribute uvec4 vBones;

varying vec3 fWorldPos;
varying vec3 fWorldNormal;

void main(void) {
    mat4 skinMat = vWeights.x * boneMat[vBones.x];
    skinMat += vWeights.y * boneMat[vBones.y];
    skinMat += vWeights.z * boneMat[vBones.z];
    skinMat += vWeights.w * boneMat[vBones.w];

    fWorldPos = (mModel * skinMat * vec4(vPos, 1.0)).xyz;
    fWorldNormal = (mModel * skinMat * vec4(vNorm, 0.0)).xyz;

    gl_Position = mProj * mView * vec4(fWorldPos, 1.0);
}
`;

/**
 * GLSL fragment shader code
 */
let fsText = `
precision mediump float;
struct Material {
    vec4 ambient;
    vec4 diffuse;
};
struct Light {
    vec4 ambient;
    vec4 diffuse;
    vec3 direction;
};
uniform Material objectMaterial;
uniform Light sun;
uniform vec3 cameraPosition;

varying vec3 fWorldPos;
varying vec3 fWorldNormal;

void main() {
    vec4 ambient = objectMaterial.ambient * sun.ambient;
    vec4 diffuse = vec4(0, 0, 0, 0);
    float diffuseFactor = clamp(-dot(sun.direction, fWorldNormal), 0, 1);
    diffuse = diffuseFactor * objectMaterial.diffuse * sun.diffuse;

    gl_FragColor = clamp(ambient + diffuse, 0.0, 1.0);
}
`;


/**
 * GL program that can draw an object of a solid color with a bunch of animation data provided as well.
 *  This draws the data produced by the animation system.
 */
export class AnimatedEntityProgram {
    constructor() {
        this.gl = null;
        this.program = null;
        this.modelTransform = null;
        this.viewTransform = null;
        this.projTransform = null;
        this.bonesArray = null;

        this.lightAmbientColor = null;
        this.lightDiffuseColor = null;
        this.lightDiffuseColor = null;

        this.materialAmbientColor = null;
        this.materialDiffuseColor = null;

        this.cameraPosition = null;
    }

    //
    // Uniform Locations
    //
    private gl: WebGLRenderingContext|null;
    private program: WebGLProgram|null;
    private modelTransform: WebGLUniformLocation|null;
    private viewTransform: WebGLUniformLocation|null;
    private projTransform: WebGLUniformLocation|null;
    private bonesArray: WebGLUniformLocation|null;

    private lightAmbientColor: WebGLUniformLocation|null;
    private lightDiffuseColor: WebGLUniformLocation|null;
    private lightDirection:WebGLUniformLocation|null;

    private materialAmbientColor: WebGLUniformLocation|null;
    private materialDiffuseColor: WebGLUniformLocation|null;

    private cameraPosition: WebGLUniformLocation|null;

    //
    // Attributes
    //
    private positionAttrib: number;
    private normalAttrib: number;
    private weightsAttrib: number;
    private bonesAttrib: number;

    //
    // Public Interface
    //
    public prepare(gl: WebGLRenderingContext) {
        if (this.gl != gl) {
            // Compile Shaders
            let vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, vsText);
            gl.compileShader(vs);
            if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                console.error('Failed to compile animated entity vertex shader: ', gl.getShaderInfoLog(vs));
                return;
            }

            let fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fsText);
            gl.compileShader(fs);
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                console.error('Failed to compile animated entity fragment shader: ', gl.getShaderInfoLog(fs));
                return;
            }

            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                console.error('Failed to link animated entity program: ', gl.getProgramInfoLog(this.program));
            }

            // Get Uniform Handles
            this.modelTransform = gl.getUniformLocation(this.program, 'mModel');
            this.viewTransform = gl.getUniformLocation(this.program, 'mView');
            this.projTransform = gl.getUniformLocation(this.program, 'mProj');
            this.bonesArray = gl.getUniformLocation(this.program, 'boneMat');

            this.lightAmbientColor = gl.getUniformLocation(this.program, 'sun.ambient');
            this.lightDiffuseColor = gl.getUniformLocation(this.program, 'sun.diffuse');
            this.lightDiffuseColor = gl.getUniformLocation(this.program, 'sun.direction');

            this.materialAmbientColor = gl.getUniformLocation(this.program, 'objectMaterial.ambient');
            this.materialDiffuseColor = gl.getUniformLocation(this.program, 'objectMaterial.diffuse');

            this.cameraPosition = gl.getUniformLocation(this.program, 'cameraPosition');

            // Get Attribute Handles
            this.positionAttrib = gl.getAttribLocation(this.program, 'vPos');
            this.normalAttrib = gl.getAttribLocation(this.program, 'vNorm');
            this.weightsAttrib = gl.getAttribLocation(this.program, 'vWeights');
            this.bonesAttrib = gl.getAttribLocation(this.program, 'vBones');

            // Set cached GL context (to be used until next context loss)
            this.gl = gl;
        }

        gl.useProgram(this.program);

        gl.enableVertexAttribArray(this.positionAttrib);
        gl.enableVertexAttribArray(this.normalAttrib);
        gl.enableVertexAttribArray(this.weightsAttrib);
        gl.enableVertexAttribArray(this.bonesAttrib);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
    }

    public disengage(gl: WebGLRenderingContext) {
        if (this.gl != gl) return;

        gl.disableVertexAttribArray(this.bonesAttrib);
        gl.disableVertexAttribArray(this.weightsAttrib);
        gl.disableVertexAttribArray(this.normalAttrib);
        gl.disableVertexAttribArray(this.positionAttrib);

        gl.useProgram(null);
    }

    public setSceneData(gl: WebGLRenderingContext, projMatrix: Mat4, lightData: DirectionalLight) {
        if (this.gl != gl) return;

        if (!(this.projTransform && this.lightAmbientColor && this.lightDiffuseColor && this.lightDirection)) {
            return console.warn('Needed uniforms not set - aborting');
        }

        gl.uniformMatrix4fv(this.projTransform, false, projMatrix.data);
        gl.uniform4fv(this.lightAmbientColor, lightData.ambientColor.data);
        gl.uniform4fv(this.lightDiffuseColor, lightData.diffuseColor.data);
        gl.uniform3fv(this.lightDirection, lightData.direction.data);
    }

    public setPerFrameData(gl: WebGLRenderingContext, viewMatrix: Mat4, frameBones: Float32Array, cameraPos: Vec3) {
        if (this.gl != gl) return;

        if (!(this.viewTransform && this.bonesArray && this.cameraPosition)) {
            return console.warn('Needed uniforms not set - aborting');
        }

        gl.uniformMatrix4fv(this.viewTransform, false, viewMatrix.data);
        gl.uniformMatrix4fv(this.bonesArray, false, frameBones);
        gl.uniform3fv(this.cameraPosition, cameraPos.data);
    }

    public renderObject(gl: WebGLRenderingContext, call: AnimatedEntityRenderCall) {
        if (this.gl != gl) return;

        if (!(this.modelTransform && this.materialAmbientColor && this.materialDiffuseColor)) {
            return console.warn('Needed uniforms not set - aborting');
        }

        gl.uniformMatrix4fv(this.modelTransform, false, call.worldTransform.data);
        gl.uniform4fv(this.materialAmbientColor, call.modelData.material.ambient.data);
        gl.uniform4fv(this.materialDiffuseColor, call.modelData.material.diffuse.data);

        call.modelData.prepare(gl);
        gl.bindBuffer(gl.ARRAY_BUFFER, call.modelData.vb);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, call.modelData.ib);

        gl.drawElements(gl.TRIANGLES, call.modelData.indices.length, gl.UNSIGNED_SHORT, 0);
    }
};