/**
 * Helper math utilities for the animation managers
 */

#include <cstdint>
#include <cmath>

struct Vec3
{
    float x, y, z;
};

void vlerp(Vec3& o, const Vec3& a, const Vec3& b, float t)
{
    o.x = a.x * (1.f - t) + b.x * t;
    o.y = a.y * (1.f - t) + b.y * t;
    o.z = a.z * (1.f - t) + b.z * t;
}

float flerp(float a, float b, float t)
{
    return a * (1.f - t) + b * t;
}

struct Quat
{
    float x, y, z, w;
};

// https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
void qslerp(Quat& o, const Quat& a, const Quat& b, float t)
{
    float ax = a.x, ay = a.y, az = a.z, aw = a.w;
    float bx = b.x, by = b.y, bz = b.z, bw = b.w;

    float omega, cosom, sinom, scale0, scale1;
    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if (cosom < 0.f)
    {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    // calculate coefficients
    if ((1.f - cosom) > 0.000001f)
    {
        // standard case (slerp)
        omega = acos(cosom);
        sinom = sin(omega);
        scale0 = sin((1.f - t) * omega) / sinom;
        scale1 = sin(t * omega) / sinom;
    }
    else
    {
        // from and two quaternions are very close, so we do a linear interpolation
        scale0 = 1.f - t;
        scale1 = t;
    }

    // calculate final values
    o.x = scale0 * ax + scale1 * bx;
    o.y = scale0 * ay + scale1 * by;
    o.z = scale0 * az + scale1 * bz;
    o.w = scale0 * aw + scale1 * bw;
}

struct Mat4
{
    float m[16];
};

// https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/mat4.js
void setRotationTranslationScale(Mat4& o, const Quat& rot, const Vec3& pos, const Vec3& scl)
{
    // Quaternion math
    float x = rot.x, y = rot.y, z = rot.z, w = rot.w,
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
        sx = scl.x,
        sy = scl.y,
        sz = scl.z;

    o.m[ 0] = (1.f - (yy + zz)) * sx;
    o.m[ 1] = (xy + wz) * sx;
    o.m[ 2] = (xz - wy) * sx;
    o.m[ 3] = 0.f;
    o.m[ 4] = (xy - wz) * sy;
    o.m[ 5] = (1.f - (xx + zz)) * sy;
    o.m[ 6] = (yz + wx) * sy;
    o.m[ 7] = 0.f;
    o.m[ 8] = (xz + wy) * sz;
    o.m[ 9] = (yz - wx) * sz;
    o.m[10] = (1.f - (xx + yy)) * sz;
    o.m[11] = 0.f;
    o.m[12] = pos.x;
    o.m[13] = pos.y;
    o.m[14] = pos.z;
    o.m[15] = 1.f;
}

void setIdentity(Mat4& o)
{
    o.m[ 0] = 1.f;
    o.m[ 1] = 0.f;
    o.m[ 2] = 0.f;
    o.m[ 3] = 0.f;
    o.m[ 4] = 0.f;
    o.m[ 5] = 1.f;
    o.m[ 6] = 0.f;
    o.m[ 7] = 0.f;
    o.m[ 8] = 0.f;
    o.m[ 9] = 0.f;
    o.m[10] = 1.f;
    o.m[11] = 0.f;
    o.m[12] = 0.f;
    o.m[13] = 0.f;
    o.m[14] = 0.f;
    o.m[15] = 1.f;
}

void m4mul(Mat4& o, const Mat4& a, const Mat4& b)
{
    for (uint8_t row = 0u; row < 4u; row++)
    {
        for (uint8_t col = 0u; col < 4u; col++)
        {
            o.m[row * 4u + col] = 0.f;
            for (uint8_t k = 0u; k < 4u; k++)
            {
                o.m[row * 4 + col] += b.m[row * 4 + k] * a.m[k * 4 + col];
            }
        }
    }
}

struct PositionKeyframe
{
    float time;
    Vec3 pos;
};

struct RotationKeyframe
{
    float time;
    Quat rot;
};

struct ScalingKeyframe
{
    float time;
    Vec3 scl;
};

struct AnimatedBone
{
    uint32_t ID;

    std::uint32_t nPositionKeyframes;
    PositionKeyframe* positionChannel;

    std::uint32_t nRotationKeyframes;
    RotationKeyframe* rotationChannel;

    std::uint32_t nScalingKeyframes;
    ScalingKeyframe* scalingChannel;
};

struct ModelData
{
    uint32_t numBones;
    uint32_t* boneIDs;
    Mat4* boneOffsets;
};

struct StaticBone
{
    uint32_t ID;

    uint32_t parentID;
    Mat4 transform;
};

struct Animation
{
    float duration;

    std::uint32_t numStaticBones;
    StaticBone* staticBones;

    std::uint32_t numAnimatedBones;
    AnimatedBone* animatedBones;
};

bool getAnimatedBone(AnimatedBone& o, const Animation& animation, uint32_t ID)
{
    // Binary search for the animated bone in the selection
    uint32_t start = 0u;
    uint32_t end = animation.numAnimatedBones - 1u;

    if (ID < animation.animatedBones[0].ID) return false;
    if (ID > animation.animatedBones[animation.numAnimatedBones - 1u].ID) return false;

    while (end - start >= 1u)
    {
        uint32_t mid = (start + end) / 2u;
        if (animation.animatedBones[mid].ID == ID)
        {
            o = animation.animatedBones[mid];
            return true;
        }
        else if (animation.animatedBones[mid].ID < ID)
        {
            mid = start + 1u;
        }
        else
        {
            mid = end - 1u;
        }
    }

    return false;
}