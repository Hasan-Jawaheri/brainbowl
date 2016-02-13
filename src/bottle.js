function Bottle(canvas) {
    this.width = Bottle.WIDTH;
    this.height = Bottle.HEIGHT;
    this.time = 0;
    this.threshold = 0.3;

    this.doBlur = true;
    this.doThreshold = true;

    this.world = new B.World(Bottle.GRAVITY, false);
    this.polys = [];
    this.buildOuter();
    this.addSpike(Bottle.BOWL[0], 1);
    this.addSpike(Bottle.BOWL[1], 1);
    this.addSpike(Bottle.BOWL[2], 1);
    this.addSpike(Bottle.BOWL[3], 1);
    this.cup1 = this.addSpike(Bottle.BOWL[4], 2);
    this.cup2 = this.addSpike(Bottle.BOWL[4], 2, 1);

    this.balls = [];
    for (var i = 0; i < Bottle.BALL_COUNT; i++) {
        var rand = this.random();
        var pos = new B.Vec2(Bottle.BOWL[4].get_x() + rand.get_x() / 50,
                             Bottle.BOWL[4].get_y() + rand.get_y() / 50);
        this.addBall(pos);
    }

    this.quad_verts = this.addQuad(1, 1);
    this.brain_verts = this.addQuad(3, 3); // has to be (3, 3)! (3x3 quad)

    this.fps = new FPS();
    var gl = this.gl = Igloo.getContext(canvas);
    if (gl == null) {
        alert('Could not initialize WebGL!');
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    function program(v, f) {
        return new Igloo.Program(gl, 'src/' + v, 'src/' + f);
    }
    this.programs = {
        balls:     program('ball.vert', 'ball.frag'),
        blur:      program('identity.vert', 'blur.frag'),
        threshold: program('identity.vert', 'threshold.frag'),
        spikes:    program('identity.vert', 'color.frag'),
        pourer:    program('rotor.vert', 'color.frag'),
        brain:     program('brain.vert', 'brain.frag'),
    };

    var spikes = [];
    var spikes_pourer = [];
    var w = this.width, h = this.height;
    this.polys.forEach(function(poly) {
        var x = poly.pos.get_x(), y = poly.pos.get_y();
        poly.verts.forEach(function(vert) {
            spikes.push((vert.get_x() + x) / w * 2);
            spikes.push((vert.get_y() + y) / h * 2);
        });
    });
    var x = this.polys[this.polys.length-1].pos.get_x();
    var y = this.polys[this.polys.length-1].pos.get_y();
    for (var i = this.polys.length-5; i < this.polys.length; i++) {
        this.polys[i].verts.forEach(function(vert) {
            spikes_pourer.push((vert.get_x() + x) / w * 2);
            spikes_pourer.push((vert.get_y() + y) / h * 2);
        });
    }

    this.buffers = {
        balls:  new Igloo.Buffer(gl),
        spikes: new Igloo.Buffer(gl, new Float32Array(spikes)),
        quad:   new Igloo.Buffer(gl, new Float32Array([
                -1, -1, 1, -1, -1, 1, 1, 1
        ])),
        spikes_pourer: new Igloo.Buffer(gl, new Float32Array(spikes_pourer)),
        img: new Igloo.Buffer(gl, new Float32Array(this.quad_verts)),
        brain: new Igloo.Buffer(gl, new Float32Array(this.brain_verts)),
    };

    this.fbo = gl.createFramebuffer();
    this.textures = {
        front: this.createTexture(),
        back:  this.createTexture()
    };

    this.brainTexture = this.loadTexture("brain.png");
    this.bowlTexture = this.loadTexture("bowl.png");
    this.bowlTexture2 = this.loadTexture("bowl2.png");
    this.logoTexture = this.loadTexture("logo.png");

    this.is_pouring = false;
    this.target = null;
    this.brain_offset = vec2(0, 0.05);
    this.input_list = [];
    this.speed = Bottle.IDLE_SPEED;
    this.disturbance = Bottle.IDLE_DISTURBANCE;
    this.juicing = false;
    this.juice_size = Bottle.BALL_COUNT;
}

function handleTextureLoaded(gl, image, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

Bottle.prototype.loadTexture = function (file) {
  var texture = this.gl.createTexture();
  var image = new Image();
  var me = this;
  image.onload = function() {
    handleTextureLoaded(me.gl, image, texture);
  }
  image.src = file;

  return texture;
}

Bottle.WIDTH = 100;
Bottle.HEIGHT = 200;
Bottle.FPS = 60;
Bottle.JUICE_THRESHOLD = 50;
Bottle.JUICING_SPEED = 0.1;
Bottle.JUICING_DISTURBANCE = 0.06;
Bottle.IDLE_SPEED = 2.0;
Bottle.IDLE_DISTURBANCE = 0.05;
Bottle.BALL_COUNT = 200;
Bottle.BALL_RADIUS = 0.5;
Bottle.BALL_DENSITY = 1;
Bottle.BALL_FRICTION = 0;
Bottle.BALL_RESTITUTION = 0.3;
Bottle.GRAVITY = new B.Vec2(0, -10);
Bottle.NGRAVITY = new B.Vec2(0, -Bottle.GRAVITY.get_y());
Bottle.FLIP_RATE = 2.4;
Bottle.SPIKE_THICKNESS = 40;
Bottle.SPIKE_EXTENT = 10;
Bottle.BOWL = [new B.Vec2 (-37, -60),
               new B.Vec2 (-12, -60),
               new B.Vec2 ( 12, -60),
               new B.Vec2 ( 37, -60),
               new B.Vec2 ( 0, 10)];

/**
 * @param {number} x A dimension
 * @returns {number} The smallest power of 2 >= x
 */
Bottle.highest2 = function(x) {
    return Math.pow(2, Math.ceil(Math.log(x) / Math.LN2));
};

Bottle.prototype.texScale = function() {
    return vec2(Bottle.highest2(this.gl.canvas.width),
                Bottle.highest2(this.gl.canvas.height));
};

/**
 * @returns {WebGLTexture} An appropriately initialized intermediate texture
 */
Bottle.prototype.createTexture = function() {
    var gl = this.gl, tex = gl.createTexture(),
        scale = this.texScale();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scale.x, scale.y,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
};

/**
 * Swaps the front and back textures and bind the back texture.
 */
Bottle.prototype.swap = function() {
    var gl = this.gl,
        temp = this.textures.front;
    this.textures.front = this.textures.back;
    this.textures.back = temp;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.back);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, this.textures.back, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    return this;
};

Bottle.prototype.buildOuter = function() {
    var thickness = 0.1;
    var box = new B.PolygonShape(), def = new B.BodyDef();

    def.set_position(new B.Vec2(this.width / 2, 0));
    box.SetAsBox(thickness / 2, this.height / 2);
    this.world.CreateBody(def).CreateFixture(box, 0);

    def.set_position(new B.Vec2(-this.width / 2, 0));
    box.SetAsBox(thickness / 2, this.height / 2);
    this.world.CreateBody(def).CreateFixture(box, 0);

    def.set_position(new B.Vec2(0, this.height / 2));
    box.SetAsBox(this.width / 2, thickness / 2);
    this.world.CreateBody(def).CreateFixture(box, 0);

    def.set_position(new B.Vec2(0, -this.height / 2));
    box.SetAsBox(this.width / 2, thickness / 2);
    this.world.CreateBody(def).CreateFixture(box, 0);
};

Bottle.prototype.addSpike = function(pos, scale, disable_mid) {
    disable_mid = disable_mid || 0;
    var thickness = Bottle.SPIKE_THICKNESS;
    var def = new B.BodyDef();
    def.set_position(pos);
    var body = this.world.CreateBody(def);

    var verts = [
        [
            new B.Vec2( 1.5 * scale, -6 * scale),
            new B.Vec2(-1.5 * scale, -6 * scale),
            new B.Vec2( 0 * scale, -8 * scale),
        ],
        [
            new B.Vec2( -1.5 * scale, -6 * scale),
            new B.Vec2(-4 * scale, -4 * scale),
            new B.Vec2( -3 * scale, -8 * scale),
        ],
        [
            new B.Vec2( 4 * scale, -4 * scale),
            new B.Vec2( 1.5 * scale, -6 * scale),
            new B.Vec2( 3 * scale, -8 * scale),
        ],
        [
            new B.Vec2( 6.5 * scale, 4 * scale),
            new B.Vec2( 4 * scale, -4 * scale),
            new B.Vec2( 7 * scale, -2 * scale),
        ],
        [
            new B.Vec2( 7.5 * scale, 16 * scale),
            new B.Vec2( 6.5 * scale, 4 * scale),
            new B.Vec2( 7.5 * scale, 6 * scale),
        ],
        [
            new B.Vec2(-4 * scale, -4 * scale),
            new B.Vec2(-6.5 * scale, 4 * scale),
            new B.Vec2(-7 * scale, -2 * scale),
        ],
        [
            new B.Vec2(-6.5 * scale, 4 * scale),
            new B.Vec2(-7.5 * scale, 16 * scale),
            new B.Vec2(-7.5 * scale, 6 * scale),
        ],
    ];

    for (var i = 0; i < verts.length; i++) {
        if (disable_mid && (i == 0))
            continue;
        this.polys.push({pos: pos, verts: verts[i]});
        var fix = new B.FixtureDef();
        fix.set_shape(createPolygonShape(verts[i]));
        fix.set_density(1.0);
        fix.set_friction(0);
        body.CreateFixture(fix);
    }

    return body;
};

Bottle.prototype.addQuad = function (sx, sy) {
    var output = [];
    for (var x = 0; x < sx; x++) {
        for (var y = 0; y < sy; y++) {
            var verts = [
                [x     / sx, y     / sy],
                [(x+1) / sx, y     / sy],
                [x     / sx, (y+1) / sy],

                [(x+1) / sx, y     / sy],
                [(x+1) / sx, (y+1) / sy],
                [x     / sx, (y+1) / sy],
            ];
            for (var i = 0; i < verts.length; i++) {
                output.push((verts[i][0] - 0.5) * 0.6);
                output.push((verts[i][1] - 0.5) * 0.8 + 0.25);
                output.push(verts[i][0]);
                output.push(1-verts[i][1]);
            }
        }
    }

    return output;
}

Bottle.prototype.random = function() {
    return new B.Vec2(Math.random() * this.width - (this.width / 2),
                      Math.random() * this.height - (this.height / 2));
};

Bottle.prototype.addBall = function(pos) {
    pos = pos || this.random();
    var def = new B.BodyDef();
    def.set_position(pos);
    def.set_type(B.b2_dynamicBody);
    var circle = new B.CircleShape();
    circle.set_m_radius(Bottle.BALL_RADIUS);
    var mass = new B.FixtureDef();
    mass.set_shape(circle);
    mass.set_density(Bottle.BALL_DENSITY);
    mass.set_friction(Bottle.BALL_FRICTION);
    mass.set_restitution(Bottle.BALL_RESTITUTION);
    this.balls.push(this.world.CreateBody(def).CreateFixture(mass));
};

Bottle.prototype.createNewBrainBuf = function() {
    var newbuf = this.addQuad(3, 3);
    var warpers = [[], [], [], []];
    var points = [[1/3, 1/3], [2/3, 1/3], [2/3, 1/3], [2/3, 2/3]];
    var closeTo = function(idx, x, y) {
        return Math.abs(x-newbuf[idx+2]) + Math.abs(y-newbuf[idx+3]) < 0.1;
    };
    for (var j = 0; j < points.length; j++) {
        for (var i = 0; i < newbuf.length; i += 4) {
            if (closeTo(i, points[j][0], 1-points[j][1])) {
                warpers[j].push(i);
            }
        }
    }
    var t = this.time / this.speed * Math.PI;
    var warps = [
        [Math.cos(t + 0.1), Math.sin(t + 0.1)],
        [Math.sin(t + 0.3), Math.cos(t + 0.5)],
        [Math.cos(t + 0.8), Math.sin(t + 1.1)],
        [Math.sin(t + 2.0), Math.cos(t + 3.1)],
    ];
    for (var i = 0; i < warpers.length; i++) {
        for (var j = 0; j < warpers[i].length; j++) {
            newbuf[warpers[i][j]+0] += warps[i][0] * this.disturbance;
            newbuf[warpers[i][j]+1] += warps[i][1] * this.disturbance;
        }
    }
    return newbuf;
};

Bottle.prototype.render = function() {
    var gl = this.gl;
    var w = this.gl.canvas.width, h = this.gl.canvas.height;
    var sx = w / this.width * 2, sy = h / this.height * 2;

    var brainBuf = this.createNewBrainBuf();
    this.buffers.brain.update(new Float32Array(brainBuf));

    /* Update balls vertex attribute. */
    this.juice_size = 0;
    for (var i = 0; i < this.balls.length; i++) {
        var height = this.balls[i].GetBody().GetPosition().get_y();
        if (height < -80) {
            this.world.DestroyBody(this.balls[i].GetBody());
            this.balls.splice(i, 1);
            i -= 1;
        } else if (height > 0) {
            this.juice_size += 1;
        }
    }
    var pos = new Float32Array(this.balls.length * 2);
    for (var i = 0; i < this.balls.length; i++) {
        var p = this.balls[i].GetBody().GetPosition();
        pos[i * 2 + 0] = p.get_x() / w * sx;
        pos[i * 2 + 1] = p.get_y() / h * sy;
    }
    this.buffers.balls.update(pos);

    this.swap();

    gl.bindTexture(gl.TEXTURE_2D, this.brainTexture);
    this.programs.brain.use()
        .attrib('pos_uv', this.buffers.brain, 4)
        .uniform('offset', this.brain_offset)
        .uniform('scale', 1.0)
        .uniform('base', 0, true)
        .uniform('alpha', 1)
        .draw(gl.TRIANGLES, this.brain_verts.length  / 4);


    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    this.programs.balls.use()
        .attrib('ball', this.buffers.balls, 2)
        .uniform('size', Bottle.BALL_RADIUS * sx)
        .draw(gl.POINTS, this.balls.length);
    this.swap();

    if (this.doBlur) {
        this.programs.blur.use()
            .attrib('position', this.buffers.quad, 2)
            .uniform('base', 0, true)
            .uniform('scale', this.texScale())
            .uniform('dir', vec2(0.0, 1.0))
            .draw(gl.TRIANGLE_STRIP, 4);
        this.swap();

        this.programs.blur
            .uniform('dir', vec2(1.0, 0.0))
            .draw(gl.TRIANGLE_STRIP, 4);
        this.swap();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.programs.threshold.use()
        .attrib('position', this.buffers.quad, 2)
        .uniform('base', 0, true)
        .uniform('scale', this.texScale())
        .uniform('copy', !this.doThreshold, true)
        .uniform('threshold', this.threshold)
        .draw(gl.TRIANGLE_STRIP, 4);


    gl.bindTexture(gl.TEXTURE_2D, this.brainTexture);
    this.programs.brain.use()
        .attrib('pos_uv', this.buffers.brain, 4)
        .uniform('offset', this.brain_offset)
        .uniform('scale', 1.0)
        .uniform('base', 0, true)
        .uniform('alpha', 0.5)
        .draw(gl.TRIANGLES, this.brain_verts.length  / 4);

    gl.bindTexture(gl.TEXTURE_2D, this.bowlTexture);
    this.programs.brain.use()
        .attrib('pos_uv', this.buffers.img, 4)
        .uniform('offset', this.brain_offset)
        .uniform('scale', 1.0)
        .uniform('base', 0, true)
        .uniform('alpha', 1)
        .draw(gl.TRIANGLES, this.quad_verts.length  / 4);

    gl.bindTexture(gl.TEXTURE_2D, this.bowlTexture2);
    for (var i = 0; i < 4; i++) {
        var x = 2 * Bottle.BOWL[i].get_x() / this.width;
        var y = 2 * Bottle.BOWL[i].get_y() / this.height;
        this.programs.brain.use()
            .attrib('pos_uv', this.buffers.img, 4)
            .uniform('scale', 0.5)
            .uniform('offset', vec2(x, y - 0.03))
            .uniform('base', 0, true)
            .uniform('alpha', 1)
            .draw(gl.TRIANGLES, this.quad_verts.length  / 4);
    }

    gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
    var logoPos = this.brain_offset;
    logoPos.y += 0.1;
    this.programs.brain.use()
        .attrib('pos_uv', this.buffers.img, 4)
        .uniform('offset', logoPos)
        .uniform('scale', 1.0)
        .uniform('base', 0, true)
        .uniform('alpha', 1.0)
        .draw(gl.TRIANGLES, this.quad_verts.length  / 4);
    logoPos.y -= 0.1;

/*
    this.programs.spikes.use()
        .attrib('position', this.buffers.spikes, 2)
        .uniform('color', vec4(0.5, 0.5, 0.5, 1.0))
        .draw(gl.TRIANGLES, (this.polys.length-5) * 3);

    this.programs.pourer.use()
        .attrib('position', this.buffers.spikes_pourer, 2)
        .uniform('color', vec4(0.5, 0.5, 0.5, 1.0))
        .draw(gl.TRIANGLES, 5 * 3);
*/
};

Bottle.prototype.step = function() {
    this.fps.tick();
    this.time += 1 / Bottle.FPS;

    var target_s = Bottle.IDLE_SPEED, target_d = Bottle.IDLE_DISTURBANCE;
    if (this.juice_size < Bottle.JUICE_THRESHOLD) {
        this.juicing = true;
    }
    if (this.juicing) {
        target_s = Bottle.JUICING_SPEED;
        target_d = Bottle.JUICING_DISTURBANCE;
        if (this.juice_size >= Bottle.BALL_COUNT) {
            this.juicing = false;
            target_s = Bottle.IDLE_SPEED;
            target_d = Bottle.IDLE_DISTURBANCE;
        } else {
            if ((this.juice_timer || 0) + 0.01 < this.time) {
                this.juice_timer = this.time;
                var rand = this.random();
                var pos = this.cup2.GetPosition();
                this.addBall(new B.Vec2(pos.get_x() + rand.get_x() / 10,
                                        pos.get_y() + rand.get_y() / 10 + 4));
            }
        }
    }
    if (Math.abs(this.speed-target_s) > 0.01)
        this.speed += (target_s-this.speed) * 0.005;
    if (Math.abs(this.disturbance-target_d) > 0.001)
        this.disturbance += (target_d-this.disturbance) * 0.0005;

    this.process_input();

    if (this.target != null && !this.is_pouring) {
        //console.log("moving...");
        var target_x = Bottle.BOWL[this.target].get_x();
        var cur_x = this.cup1.GetPosition().get_x();
        var cur_y = Bottle.BOWL[Bottle.BOWL.length-1].get_y();
        var delta = target_x - cur_x;
        if (Math.abs(delta) > 40)
            delta = 40 * delta/(Math.abs(delta));
        var new_x = cur_x + delta * 0.01;
        if (Math.abs(delta) < 15)
            new_x += delta * 0.01;

        this.brain_offset = vec2(2 * new_x / this.width, 0.05);

        this.cup1.SetTransform(new B.Vec2(new_x, cur_y), 0);
        this.cup2.SetTransform(new B.Vec2(new_x, cur_y), 0);
        if (Math.abs(delta) < 2) {
            if (!this.is_pouring && !this.juicing) {
                //console.log("LET IT POUR!");
                this.is_pouring = true;
                var me = this;
                setTimeout(function () {
                    //console.log("Done!");
                    me.is_pouring = false;
                    me.target = null; // stop score animation
                }, 1500);
            }
        }
    }

    if (this.is_pouring) {
        this.cup1.SetTransform(new B.Vec2(-300, -300), 0);
    }
    else {
        this.cup1.SetTransform(this.cup2.GetPosition(), 0);
    }
    this.world.Step(1 / 30, 8, 3);
};

Bottle.prototype.process_input = function () {
    for (var i = 0; i < this.input_list.length; i++) {
        var idx = this.input_list[i][0];
        var is_down = this.input_list[i][1] || 0;
        if (is_down) {
            var score = parseInt($("#score" + idx)[0].innerHTML);
            $("#score" + idx)[0].innerHTML = score - 1;
        }
        else if (this.target == null) {
            this.target = idx;
            var score = parseInt($("#score" + idx)[0].innerHTML);
            $("#score" + idx)[0].innerHTML = score + 1;
        }
    }
    this.input_list = [];
}

Bottle.prototype.scoreFor = function(idx, is_down) {
    this.input_list.push([idx, is_down]);
};
