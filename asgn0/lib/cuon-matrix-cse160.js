// cuon-matrix.js (c) 2012 kanda and matsuda
/**
 * This is a class treating 4x4 matrix.
 * This class contains the function that is equivalent to OpenGL matrix stack.
 * The matrix after conversion is calculated by multiplying a conversion matrix from the right.
 * The matrix is replaced by the calculated result.
 */

class Vector3 {
    constructor(opt_src) {
        var v = new Float32Array(3);
        if (opt_src && typeof opt_src === 'object') {
          v[0] = opt_src[0];
          v[1] = opt_src[1];
          v[2] = opt_src[2];
        }
        this.elements = v;
    }

    /**
     * Copy vector.
     * @param src source vector
     * @return this
     */
    set(src) {
        var i, s, d;

        s = src.elements;
        d = this.elements;

        if (s === d) {
          return;
        }

        for (i = 0; i < 3; ++i) {
          d[i] = s[i];
        }

        return this;
    }

    /**
      * Add other to this vector.
      * @return this
      */
    add(other) {
        this.elements[0] = this.elements[0] + other.elements[0];
        this.elements[1] = this.elements[1] + other.elements[1];
        this.elements[2] = this.elements[2] + other.elements[2];
        return this;
    };

    /**
      * Subtract other from this vector.
      * @return this
      */
    sub(other) {
        this.elements[0] = this.elements[0] - other.elements[0];
        this.elements[1] = this.elements[1] - other.elements[1];
        this.elements[2] = this.elements[2] - other.elements[2];
        return this;
    };

    /**
      * Divide this vector by a scalar.
      * @return this
      */
    div(scalar) {
        this.elements[0] = this.elements[0] / scalar;
        this.elements[1] = this.elements[1] / scalar;
        this.elements[2] = this.elements[2] / scalar;
        return this;
    };

    /**
      * Multiply this vector by a scalar.
      * @return this
      */
    mul(scalar) {
        this.elements[0] = this.elements[0] * scalar;
        this.elements[1] = this.elements[1] * scalar;
        this.elements[2] = this.elements[2] * scalar;
        return this;
    };

    /**
      * Calcualte the dop product between this vector and other.
      * @return scalar
      */
    static dot(other1, other2) {
        let d = other1.elements[0] * other2.elements[0] +
                other1.elements[1] * other2.elements[1] +
                other1.elements[2] * other2.elements[2];
        return d;
    }

    /**
      * Calcualte the cross product between this vector and other.
      * @return new vector
      */
    static cross(other1, other2) {
        let a = other1.elements;
        let b = other2.elements;

        let v3 = new Vector3([
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ]);

        return v3;
    }

    /**
      * Calculate the magnitude (or length) of this vector.
      * @return scalar
      */
    magnitude() {
        let m = Math.sqrt(
            this.elements[0] * this.elements[0] +
            this.elements[1] * this.elements[1] +
            this.elements[2] * this.elements[2]
        );
        return m;
    };

    /**
      * Normalize this vector.
      * @return this
      */
    normalize() {
        let m = this.magnitude();
        if (m !== 0) {
            this.elements[0] = this.elements[0] / m;
            this.elements[1] = this.elements[1] / m;
            this.elements[2] = this.elements[2] / m;
        }
        return this;
    };
}

class Vector4 {
    constructor(opt_src) {
        var v = new Float32Array(4);
        if (opt_src && typeof opt_src === 'object') {
          v[0] = opt_src[0];
          v[1] = opt_src[1];
          v[2] = opt_src[2];
          v[3] = opt_src[3];
        }
        this.elements = v;
    }
}