import {Color} from '../math/color';
import {ModelData, AnimatedEntityVertex, AnimatedEntityRenderCall, AnimatedEntityProgram} from '../render/program/animatedentityprogram';
import {Material} from '../render/material';
import {Mat4} from '../math/mat4';
import {Quaternion} from '../math/quaternion';
import {Vec3} from '../math/vec3';

let RUN_SPEED = 3;
let MODEL_URL = '/assets/Beta.json';
let RUN_URL = '/assets/standard_run.json';
let DANCE_URLS = ['/assets/samba_dancing.json', '/assets/tut_hip_hop_dance.json', '/assets/wave_hip_hop_dance.json'];

let betaModelData: ModelData[]|null = null;

export function getModelData(): Promise<ModelData[]> {
    if (betaModelData) {
        return Promise.resolve(betaModelData);
    }

    return fetch(MODEL_URL).then<any>((response) => {
        if (response.status > 299) {
            return Promise.reject(response.statusText);
        } else {
            return response.json();
        }
    }).then((jsonData) => {
        let tr: ModelData[] = [];

        for (let meshIdx = 0; meshIdx < jsonData.meshes.length; meshIdx++) {
            let mesh = jsonData.meshes[meshIdx];

            let verts: AnimatedEntityVertex[] = [];

            for (let vertIdx = 0; vertIdx < mesh.vertices.length / 3; vertIdx++) {
                verts.push(new AnimatedEntityVertex(
                    new Vec3(mesh.vertices[vertIdx * 3], mesh.vertices[vertIdx * 3 + 1], mesh.vertices[vertIdx * 3 + 2]),
                    new Vec3(mesh.normals[vertIdx * 3], mesh.normals[vertIdx * 3 + 1], mesh.normals[vertIdx * 3 + 2]),
                    [NaN, NaN, NaN, NaN],
                    [0, 0, 0, 0]
                ));
            }

            let boneNames: string[] = [];
            let boneOffsets: Mat4[] = [];

            for (let boneIdx = 0; boneIdx < mesh.bones.length; boneIdx++) {
                let bone = mesh.bones[boneIdx];
                boneNames.push(bone.name);
                let om = bone.offsetmatrix;
                boneOffsets.push(new Mat4().setElements(
                    om[ 0], om[ 4], om[ 8], om[12],
                    om[ 1], om[ 5], om[ 9], om[13],
                    om[ 2], om[ 6], om[10], om[14],
                    om[ 3], om[ 7], om[11], om[15]
                ));

                for (let weightIdx = 0; weightIdx < bone.weights.length; weightIdx++) {
                    let weight = bone.weights[weightIdx];

                    let weightSet = false;
                    for (let k = 0; !weightSet && k < 4; k++) {
                        if (isNaN(verts[weight[0]].boneWeights[k])) {
                            verts[weight[0]].boneWeights[k] = weight[1];
                            verts[weight[0]].boneIndices[k] = boneIdx;
                            weightSet = true;
                        }
                    }
                    weightSet || console.warn(`Mesh has too many affected bones at vertex ${weight[0]}, may cause rendering inaccuracies`);
                }
            }

            for (let vertIdx = 0; vertIdx < mesh.vertices.length / 3; vertIdx++) {
                for (let boneCheckIdx = 0; boneCheckIdx < 4; boneCheckIdx++) {
                    if (isNaN(verts[vertIdx].boneWeights[boneCheckIdx])) {
                        verts[vertIdx].boneWeights[boneCheckIdx] = 0;
                    }
                }
            }

            let indices = new Uint16Array([].concat.apply([], mesh.faces));

            let ambientColor = jsonData.materials[mesh.materialindex].properties.filter((x:any)=>x.key==='$clr.ambient')[0];
            let diffuseColor = jsonData.materials[mesh.materialindex].properties.filter((x:any)=>x.key==='$clr.diffuse')[0];

            tr.push(new ModelData(
                new Material(new Color(ambientColor[0], ambientColor[1], ambientColor[2], ambientColor[3]), new Color(diffuseColor[0], diffuseColor[1], diffuseColor[2], diffuseColor[3])),
                verts,
                indices,
                boneNames, boneOffsets
            ));
        }

        betaModelData = tr;
        return betaModelData;
    });
}

// TODO SESS: Continue here with "getDanceData(index: number): Promise<AnimationData>"

// TODO SESS: Do the animation interface!
/*
----- REGISTRATION / INITIALIZATION -----
- Register "Animation" objects (containing all the bones, offsets, keyframes)
- Register "ModelData" objects (containing list of needed bones, and individual bone offsets for the model)
- Register "Animation" and "ModelData" against each other - verification only in naive approaches, build caches in memoized approaches

----- FRAME DATA -----
- getSingleAnimation(Animation, ModelData, animationTime): [BoneMatrix, extraMemoryUsage]
- getBlendedAnimation(Animation1, Animation2, ModelData, animation1Time, animation2Time, blendFactor): [BoneMatrix, extraMemoryUsage]

----- METRICS DATA -----
- getStaticMemoryUsage() // How much data is being used in caches, if any? Do not include wasted WASM heap space

Outputs must not be mutated (WASM and optimized approaches, they are simply views to sensitive buffers)

*/