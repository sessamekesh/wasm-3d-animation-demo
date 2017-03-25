import {Animation, AnimatedBone, PositionKeyframe, RotationKeyframe, ScalingKeyframe} from './animation';
import {Color} from '../math/color';
import {ModelData, AnimatedEntityVertex, AnimatedEntityRenderCall, AnimatedEntityProgram} from '../render/program/animatedentityprogram';
import {Material} from '../render/material';
import {Mat4} from '../math/mat4';
import {Quaternion} from '../math/quaternion';
import {Vec3} from '../math/vec3';

let RUN_SPEED = 3;
let MODEL_URL = '/assets/Beta.json';
let ANIM_URLS = ['/assets/standard_run.json', '/assets/samba_dancing.json', '/assets/tut_hip_hop_dance.json', '/assets/wave_hip_hop_dance.json'];

export enum ANIMATIONS {
    RUN = 0,
    SAMBA = 1,
    TUT = 2,
    WAVE = 3
};

let betaModelData: ModelData[]|null = null;
let betaAnimationData: Animation[] = [];

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

            let ambientColor = jsonData.materials[mesh.materialindex].properties.filter((x:any)=>x.key==='$clr.ambient')[0].value;
            let diffuseColor = jsonData.materials[mesh.materialindex].properties.filter((x:any)=>x.key==='$clr.diffuse')[0].value;

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

export function getAnimationData(index: ANIMATIONS): Promise<Animation> {
    if (!!betaAnimationData[index]) {
        return Promise.resolve(betaAnimationData[index]);
    }

    return fetch(ANIM_URLS[index]).then<any>((response) => {
        if (response.status >= 300) {
            return Promise.reject(response.statusText);
        } else {
            return response.json();
        }
    }).then((jsonData: any) => {
        let anim = jsonData.animations[0];

        let duration = anim.duration / anim.tickspersecond;

        let toAdd = new Animation(duration);

        let nodes: {[id: string]: any} = {};
        let parents: {[id: string]: any} = {};

        //
        // Add static bones to the animation
        //
        let nodeQueue: {element: any, parent: any}[] = [];
        nodeQueue.push({
            element: jsonData.rootnode,
            parent: null
        });
        while (nodeQueue.length > 0) {
            let next = nodeQueue.pop();
            if (!next) continue; // VSCode things

            let parent = next.parent;
            let element = next.element;
            let tm = element.transformation;

            if (nodes[element.name]) {
                console.error('Two nodes with the same name. Replacing old node. This is a problem!');
            }
            nodes[element.name] = element;
            parents[element.name] = parent;

            if (toAdd.staticBones.has(element.name)) {
                console.error('Bone read twice! Replacing old bone. This is a problem!');
            }

            toAdd.staticBones.set(element.name, {
                parent: next.parent,
                transform: new Mat4().setElements(
                    tm[ 0], tm[ 4], tm[ 8], tm[12],
                    tm[ 1], tm[ 5], tm[ 9], tm[13],
                    tm[ 2], tm[ 6], tm[10], tm[14],
                    tm[ 3], tm[ 7], tm[11], tm[15]
                )
            });

            for (let child in element.children) {
                nodeQueue.push({
                    parent: element.name,
                    element: element.children[child]
                });
            }
        }

        //
        // Add channels to the animation
        //
        for (let channelIdx = 0; channelIdx < anim.channels.length; channelIdx++) {
            let channel = anim.channels[channelIdx];
            let boneName = channel.name;
            let parent = nodes[parents[boneName]];
            let node = nodes[boneName];

            let nt = node.transformation;
            let toParentTransform = new Mat4().setElements(
                nt[ 0], nt[ 4], nt[ 8], nt[12],
                nt[ 1], nt[ 5], nt[ 9], nt[13],
                nt[ 2], nt[ 6], nt[10], nt[14],
                nt[ 3], nt[ 7], nt[11], nt[15]
            );

            let positions: PositionKeyframe[] = [];
            let rotations: RotationKeyframe[] = [];
            let scales: ScalingKeyframe[] = [];

            for (let pki = 0; pki < channel.positionkeys.length; pki++) {
                positions.push(new PositionKeyframe(
                    channel.positionkeys[pki][0] / anim.tickspersecond,
                    new Vec3(channel.positionkeys[pki][1][0], channel.positionkeys[pki][1][1], channel.positionkeys[pki][1][2])
                ));
            }

            for (let idx = 0; idx < channel.rotationkeys.length; idx++) {
                rotations.push(new RotationKeyframe(
                    channel.rotationkeys[idx][0] / anim.tickspersecond,
                    new Quaternion(channel.rotationkeys[idx][1][0], channel.rotationkeys[idx][1][1], channel.rotationkeys[idx][1][2], channel.rotationkeys[idx][1][3])
                ));
            }

            for (let idx = 0; idx < channel.scalingkeys.length; idx++) {
                scales.push(new ScalingKeyframe(
                    channel.scalingkeys[idx][0] / anim.tickspersecond,
                    new Vec3(channel.scalingkeys[idx][1][0], channel.scalingkeys[idx][1][1], channel.scalingkeys[idx][1][2])
                ));
            }

            toAdd.animatedBones.set(boneName, new AnimatedBone(positions, rotations, scales));
        }

        betaAnimationData[index] = toAdd;
        return toAdd;
    });
}