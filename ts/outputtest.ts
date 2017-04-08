import {NaiveJSAnimationManager} from './model/naivejsanimationmanager';
import {NaiveWASMAnimationManager} from './model/naivewasmanimationmanager';
import {getModelData, getAnimationData, ANIMATIONS} from './model/betacharactermodel';

(function () {


Promise.all([
    getModelData().then((a) => { console.log('Model data loaded...'); return a; }),
    getAnimationData(ANIMATIONS.RUN).then((a) => { console.log('Run animation loaded...'); return a; }),
    getAnimationData(ANIMATIONS.TUT).then((a) => { console.log('Tut animation loaded...'); return a; }),
    getAnimationData(ANIMATIONS.SAMBA).then((a) => { console.log('Samba animation loaded...'); return a; }),
    getAnimationData(ANIMATIONS.WAVE).then((a) => { console.log('Wave animation loaded...'); return a; }),
    new Promise((resolve, reject) => { var naiveJS = new NaiveJSAnimationManager(); return naiveJS.load().then(() => { console.log('Naive JS animation manager loaded'); resolve(naiveJS); }); }),
    new Promise((resolve, reject) => { var naiveWasm = new NaiveWASMAnimationManager(); return naiveWasm.load().then(() => { console.log('Naive WASM animation manager loaded'); resolve(naiveWasm); }); }),
])
.then((loadResults) => {
    let modelData = loadResults[0];
    let runAnimation = loadResults[1];
    let tutAnimation = loadResults[2];
    let sambaAnimation = loadResults[3];
    let waveAnimation = loadResults[4];
    let naiveJSAnimationManager = loadResults[5] as NaiveJSAnimationManager;
    let naiveWASMAnimationManager = loadResults[6] as NaiveWASMAnimationManager;

    naiveJSAnimationManager.registerAnimation(runAnimation);
    naiveWASMAnimationManager.registerAnimation(runAnimation);
    modelData.forEach((model) => { naiveJSAnimationManager.registerModel(model); naiveWASMAnimationManager.registerModel(model) });

    for (let modelIdx = 0; modelIdx < modelData.length; modelIdx++) {
        if (!naiveJSAnimationManager.associateModelAndAnimation(runAnimation, modelData[modelIdx])) {
            console.error('Could not associate model and animation', modelData[modelIdx], runAnimation);
            return;
        }

        if (!naiveWASMAnimationManager.associateModelAndAnimation(runAnimation, modelData[modelIdx])) {
            console.error('WASM - could not associate model and animation', modelData[modelIdx], runAnimation);
            return;
        }
    }

    console.log('---- Everything loaded, let the tests begin! ----');

    //
    // SCRATCH PAD
    //
    debugger;
    var rslBuffer = naiveJSAnimationManager.getSingleAnimation(runAnimation, modelData[1], 0.05);
    var wslBuffer = naiveWASMAnimationManager.getSingleAnimation(runAnimation, modelData[1], 0.05);

    //
    // Test 1 - walking animation
    //
    var t1Interval = 0.05;
    var t1ErrTolerance = 0.05; // Error tolerance, in percent
    console.log('%cTest 1: Run Animation', 'color:blue');
    console.log(`%c--- Interval: %c${t1Interval}, %cError tolerance: %c${t1ErrTolerance}`, 'color:green', 'color:blue', 'color:green', 'color:blue');
    for (let time = 0.0; time < runAnimation.duration; time += 0.05) {
        for (let modelIdx = 0; modelIdx < modelData.length; modelIdx++) {
            let naiveResult = naiveJSAnimationManager.getSingleAnimation(runAnimation, modelData[modelIdx], time);
            let wasmResult = naiveWASMAnimationManager.getSingleAnimation(runAnimation, modelData[modelIdx], time);

            // Compare results...
            if (naiveResult.boneData.length != wasmResult.boneData.length) {
                console.log(`------ Test failed: length of naive result (${naiveResult.boneData.length / 16}) and WASM result (${wasmResult.boneData.length / 16}) differ at model ${modelIdx} and time ${time}`);
                continue;
            }

            for (let i = 0; i < naiveResult.boneData.length; i++) {
                if (naiveResult.boneData[i] != 0 && wasmResult.boneData[i] != 0) {
                    let percentDifference = (Math.abs(naiveResult.boneData[i] - wasmResult.boneData[i]) / (naiveResult.boneData[i] + wasmResult.boneData[i])) / 2.0;
                    if (percentDifference > t1ErrTolerance) {
                        console.log(`------ Test failed! untolerable error at model ${modelIdx} and time ${time}`);
                    }
                }
            }
        }
    }

    console.log('Tests finished!');
})
.catch((error) => {
    console.error('Error initializing tests!', error);
});

return null;

})();