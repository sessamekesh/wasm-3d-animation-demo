/**
 * Naive C++ implementation of an animation system
 *  Follows the same alogirthms/code as ts/model/naivejsanimationmanager.ts
 */

#include "include/math.h"

#define ERR_NULLPTR 0
#define ERR_DEBUGMSG 1
#define ERR_NOTFOUND 2
extern "C"
{
extern void alertError(uint32_t, uint32_t, uint32_t);
}

// Expectation: Animated bones are in the animation in-order when inserted
//  Channels are also pre-sorted, because writing that garbage in C doesn't sound like a fun afternoon

// Expectations for static bones:
//  - ID "0" is the root bone (has no parent, identity matrix)
//  - Index in the static bones array is the ID of that static bone

void getTransformAtTime(Mat4& o_rsl, const AnimatedBone& bone, float time)
{
    Vec3 pos;
    Quat rot;
    Vec3 scl;

    if (bone.positionChannel == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }
    if (bone.rotationChannel == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }
    if (bone.scalingChannel == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }

    // Get position component...
    if (1u == bone.nPositionKeyframes)
    {
        pos = bone.positionChannel[0u].pos;
    }
    else
    {
        float posTime = fmod(time, bone.positionChannel[bone.nPositionKeyframes - 1u].time);
        if (posTime < 0.f) posTime = posTime + bone.positionChannel[bone.nPositionKeyframes - 1u].time;

        std::uint32_t idx = 0u;
        std::uint32_t low = 0u;
        std::uint32_t high = bone.nPositionKeyframes - 1u;
        while (low < high)
        {
            idx = (low + high) / 2u;
            if (bone.positionChannel[idx + 1u].time <= posTime)
            {
                low = idx + 1u;
            }
            else if (bone.positionChannel[idx].time >= posTime)
            {
                high = idx - 1u;
            }
            else
            {
                break;
            }
        }

        float ratio = (posTime - bone.positionChannel[idx].time) / (bone.positionChannel[idx + 1u].time - bone.positionChannel[idx].time);

        vlerp(pos, bone.positionChannel[idx].pos, bone.positionChannel[idx + 1u].pos, ratio);
    }

    // Get orientation component...
    if (1u == bone.nRotationKeyframes)
    {
        rot = bone.rotationChannel[0u].rot;
    }
    else
    {
        float rotTime = fmod(time, bone.rotationChannel[bone.nRotationKeyframes - 1u].time);
        if (rotTime < 0.f) rotTime = rotTime + bone.rotationChannel[bone.nRotationKeyframes - 1u].time;

        std::uint32_t idx = 0u;
        std::uint32_t low = 0u;
        std::uint32_t high = bone.nRotationKeyframes - 1u;
        while (low < high)
        {
            idx = (low + high) / 2u;
            if (bone.rotationChannel[idx + 1u].time <= rotTime)
            {
                low = idx + 1u;
            }
            else if (bone.rotationChannel[idx].time >= rotTime)
            {
                high = idx - 1u;
            }
            else
            {
                break;
            }
        }

        float ratio = (rotTime - bone.rotationChannel[idx].time) / (bone.rotationChannel[idx + 1u].time - bone.rotationChannel[idx].time);

        qslerp(rot, bone.rotationChannel[idx].rot, bone.rotationChannel[idx + 1u].rot, ratio);
    }

    // Get scale component...
    if (1u == bone.nScalingKeyframes)
    {
        scl = bone.scalingChannel[0u].scl;
    }
    else
    {
        float sclTime = fmod(time, bone.scalingChannel[bone.nScalingKeyframes - 1u].time);
        if (sclTime < 0.f) sclTime = sclTime + bone.scalingChannel[bone.nScalingKeyframes - 1u].time;

        std::uint32_t idx = 0u;
        std::uint32_t low = 0u;
        std::uint32_t high = bone.nScalingKeyframes - 1u;
        while (low < high)
        {
            idx = (low + high) / 2u;
            if (bone.scalingChannel[idx + 1u].time <= sclTime)
            {
                low = idx + 1u;
            }
            else if (bone.scalingChannel[idx].time >= sclTime)
            {
                high = idx - 1u;
            }
            else
            {
                break;
            }
        }

        float ratio = (sclTime - bone.scalingChannel[idx].time) / (bone.scalingChannel[idx + 1u].time - bone.scalingChannel[idx].time);

        vlerp(scl, bone.scalingChannel[idx].scl, bone.scalingChannel[idx + 1u].scl, ratio);
    }

    setRotationTranslationScale(o_rsl, rot, pos, scl);
}

void getAnimatedNodeTransform(Mat4& o, const Animation& animation, float animationTime, const uint32_t id)
{
    if (id == 0)
    {
        setIdentity(o);
        return;
    }
    
    StaticBone staticBone;
    if (!getStaticBone(staticBone, animation, id))
    {
        alertError(ERR_NOTFOUND, __LINE__, id);
        return;
    }
    Mat4 parentTransform;
    getAnimatedNodeTransform(parentTransform, animation, animationTime, staticBone.parentID);

    AnimatedBone animatedBone;
    bool hasAnimatedBone = getAnimatedBone(animatedBone, animation, id);
    if (hasAnimatedBone)
    {
        Mat4 childTransform;
        getTransformAtTime(childTransform, animatedBone, animationTime);
        m4mul(o, parentTransform, childTransform);
    }
    else
    {
        m4mul(o, parentTransform, staticBone.transform);
    }
}

// Public Interface
extern "C"
{

void getSingleAnimation(Mat4* rslBuffer, Animation* animation, ModelData* model, float animationTime)
{
    if (rslBuffer == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }
    if (animation == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }
    if (model == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }
    if (model->boneOffsets == 0) { alertError(ERR_NULLPTR, __LINE__, 0); return; }

    for (uint32_t idx = 0u; idx < model->numBones; idx++)
    {
        Mat4 animatedTransform;
        getAnimatedNodeTransform(animatedTransform, *animation, animationTime, model->boneIDs[idx]);
        m4mul(rslBuffer[idx], animatedTransform, model->boneOffsets[idx]);
    }
}

void getBlendedAnimation(Mat4* rslBuffer, Animation* a1, Animation* a2, ModelData* model, float t1, float t2, float blendFactor)
{
    for (uint32_t idx = 0u; idx < model->numBones; idx++)
    {
        Mat4 a1t, a2t;
        getAnimatedNodeTransform(a1t, *a1, t1, model->boneIDs[idx]);
        getAnimatedNodeTransform(a2t, *a2, t2, model->boneIDs[idx]);
        Mat4 tt1, tt2;
        m4mul(tt1, a1t, model->boneOffsets[idx]);
        m4mul(tt2, a2t, model->boneOffsets[idx]);
        for (uint8_t midx = 0u; midx < 16; midx++)
        {
            rslBuffer[idx].m[midx] = flerp(tt1.m[midx], tt2.m[midx], blendFactor);
        }
    }
}

}