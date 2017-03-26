import {Camera} from './model/camera';

import {Color} from './math/color';
import {Vec3} from './math/vec3';
import {Mat4} from './math/mat4';
import {Quaternion} from './math/quaternion';

import {AnimatedEntityProgram, AnimatedEntityRenderCall} from './render/program/animatedentityprogram';
import {DirectionalLight} from './render/directionallight';

import {getModelData, getAnimationData, ANIMATIONS} from './model/betacharactermodel';
import {ModelData} from './render/program/animatedentityprogram';
import {Animation} from './model/animation';
import {CreateRandomDancingEntity, Entity} from './model/dancingentity';

import {AnimationManager} from './model/animationmanager';
import {NaiveJSAnimationManager} from './model/naivejsanimationmanager';
import {NaiveWASMAnimationManager} from './model/naivewasmanimationmanager';
import {SpeedyJSAnimationManager} from './model/speedyjsanimationmanager';
import {SpeedyWASMAnimationManager} from './model/speedywasmanimationmanager';

// TODO SESS: Add stats https://github.com/mrdoob/stats.js/

function getParameterByName(name: string, url?: string): string|null {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

let getCachedParameterByName = (function () {
    let paramCache: Map<string, any> = new Map();
    return (name: string, defaultValue: any, url?: string) => {
        if (!paramCache.has(name)) {
            paramCache.set(name, getParameterByName(name, url) || defaultValue);
        }
        return paramCache.get(name);
    }
})();

class Demo {
    constructor() {}

    public CreateAndStart(canvas: HTMLCanvasElement) {
        Promise.all([
            getModelData(),
            getAnimationData(ANIMATIONS.RUN),
            getAnimationData(ANIMATIONS.SAMBA),
            getAnimationData(ANIMATIONS.TUT),
            getAnimationData(ANIMATIONS.WAVE)
        ]).then((stuff) => {this.start(canvas, stuff[0], stuff[1], [stuff[2], stuff[3], stuff[4]])});
    }

    protected start(canvas: HTMLCanvasElement, betaModelData: ModelData[], betaRun: Animation, betaDances: Animation[]) {
        // With everything loaded, start opening up the screen
        document.body.className += " loaded";

        let gl = canvas.getContext('webgl');
        if (!gl) {
            return console.error('Could not create WebGL rendering context!');
        }

        //
        // Set up the model
        //
        let camera = new Camera(
            new Vec3(0, 185, 600),
            new Vec3(0, 85, 0),
            new Vec3(0, 1, 0)
        );

        let projMatrix = new Mat4().perspective(
            Math.PI * 0.45,
            gl.canvas.clientWidth / gl.canvas.clientHeight,
            0.1,
            2000.0
        );
        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;

        const VELOCITY = 80;
        const START_POS = new Vec3(0, 0, -500);
        const END_POS = new Vec3(0, 0, 500);
        const DISTANCE_TO_TRAVEL = END_POS.sub(START_POS).length();
        const EACH_OFFSET = new Vec3(175, 0, 0);

        let animationManagerType: string = getParameterByName('system') || 'default';
        if (['naivejs', 'speedyjs', 'naivewasm', 'speedywasm'].indexOf(animationManagerType) == -1) {
            animationManagerType = 'naivejs';
        }

        let animationManager: AnimationManager;
        switch (animationManagerType)
        {
            case 'speedyjs': animationManager = new SpeedyJSAnimationManager(); break;
            case 'naivewasm': animationManager = new NaiveWASMAnimationManager(); break;
            case 'speedywasm': animationManager = new SpeedyWASMAnimationManager(); break;
            default: animationManager = new NaiveJSAnimationManager();
        }

        const ANIMATION_MANAGER = animationManager;

        // Perform associations...
        betaModelData.forEach((model) => ANIMATION_MANAGER.registerModel(model));
        ANIMATION_MANAGER.registerAnimation(betaRun);
        betaModelData.forEach((model) => {
            if (!ANIMATION_MANAGER.associateModelAndAnimation(betaRun, model)) {
                console.error('Error - model', model, 'and animation', betaRun, 'cannot be associated!');
            }
        });
        betaDances.forEach((dance) => ANIMATION_MANAGER.registerAnimation(dance));
        betaDances.forEach((dance) => betaModelData.forEach((model) => {
            if (!ANIMATION_MANAGER.associateModelAndAnimation(dance, model)) {
                console.error('Error - model', model, 'and animation', betaRun, 'cannot be associated!');
            };
        }));

        let numRunners = parseInt(getParameterByName('numrunners') || '8');
        const NUM_RUNNERS = isNaN(numRunners) ? 8 : numRunners;
        
        let runners: Entity[] = [];
        for (let i = 0; i < NUM_RUNNERS; i++) {
            runners.push(CreateRandomDancingEntity(
                betaRun,
                betaDances,
                ANIMATION_MANAGER,
                DISTANCE_TO_TRAVEL,
                VELOCITY, {
                    minStartRunTime: getCachedParameterByName('minstartruntime', undefined),
                    minDanceCycles: getCachedParameterByName('mindancecycles', undefined),
                    maxDanceCycles: getCachedParameterByName('maxdancecycles', undefined)
                }
            ));
        }

        window.addEventListener('resize', () => {
            if (!gl) return; 

            projMatrix = new Mat4().perspective(
                Math.PI * 0.65,
                gl.canvas.clientWidth / gl.canvas.clientHeight,
                0.1,
                2000.0
            );
            gl.canvas.width = gl.canvas.clientWidth;
            gl.canvas.height = gl.canvas.clientHeight;

            program.prepare(gl);
            program.setSceneData(gl, projMatrix, new DirectionalLight(
                Color.WHITE,
                Color.WHITE,
                new Vec3(1, -3, 0.7).setNormal()
            ));
            program.disengage(gl);
        });
        let stats = new Stats();
        stats.showPanel(1);
        let animationTimePanel = stats.addPanel(new Stats.Panel('AnimationTime', '#f8f', '#212'));
        stats.showPanel(3);

        document.body.appendChild(stats.domElement);

        //
        // Make the GL resources
        //
        let program = new AnimatedEntityProgram();
        let calls: AnimatedEntityRenderCall[] = betaModelData.map((model) => new AnimatedEntityRenderCall(model, new Mat4()));

        program.prepare(gl);
        program.setSceneData(gl, projMatrix, new DirectionalLight(
            Color.WHITE,
            Color.WHITE,
            new Vec3(-1, -3, -0.7).setNormal()
        ));
        program.disengage(gl);

        let lastFrame = performance.now();
        let thisFrame: number;
        let dt: number;
        let frame = function () {
            //
            // Timing
            //
            thisFrame = performance.now();
            dt = (thisFrame - lastFrame) / 1000;
            lastFrame = thisFrame;

            stats.begin();
            //
            // GL resources
            //
            if (!gl) {
                console.warn('Context lost - restoring');
                gl = canvas.getContext('webgl');
                if (!gl) {
                    return console.error('Could not restore WebGL context!');
                }
            }

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0xd9/255, 0xe9/255, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            //
            // Model Updates
            //
            for (let i = 0; i < runners.length; i++) {
                runners[i].update(dt);
                if (runners[i].isFinished()) {
                    runners[i] = CreateRandomDancingEntity(betaRun, betaDances, ANIMATION_MANAGER, DISTANCE_TO_TRAVEL, VELOCITY);
                }
            }

            //
            // Scene Rendering
            //
            program.prepare(gl);

            program.setPerFrameData(gl, camera.getViewMatrix(), camera.getPosition());
            let sum = 0;
            for (let i = 0; i < runners.length; i++) {
                for (let j = 0; j < calls.length; j++) {
                    let b4 = performance.now();
                    let animationData = runners[i].getAnimationData(calls[j].modelData);
                    let after = performance.now();
                    sum = sum + (after - b4);
                    // TODO SESS: Handle the extra memory used here
                    calls[j].worldTransform.setRotationTranslationScale(
                        Quaternion.IDENTITY,
                        Vec3.lerp(START_POS, END_POS, runners[i].getTrackPos() / DISTANCE_TO_TRAVEL).setAdd(EACH_OFFSET.scale(i - runners.length / 2)),
                        Vec3.ONES
                    );

                    program.renderObject(gl, calls[j], animationData.boneData);
                }
            }
            animationTimePanel.update(sum, 8.5 * runners.length);

            program.disengage(gl);

            stats.end();

            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
};

const DemoApp: Demo = new Demo();

DemoApp.CreateAndStart(document.getElementById('demo-surface') as HTMLCanvasElement);