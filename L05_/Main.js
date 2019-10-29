"use strict";
var L05_;
(function (L05_) {
    // interface KeyPressed {
    //   [code: string]: boolean;
    // }
    var f = FudgeCore;
    window.addEventListener("load", hndLoad);
    let paddleLeft = new f.Node("PaddleLeft");
    let paddleRight = new f.Node("PaddleRight");
    let nodeBall = new f.Node("Ball");
    let nodeRoot = new f.Node("Root");
    let ballVector = new f.Vector3((Math.random() * 2 - 1) / 5, (Math.random() * 2 - 1) / 5, 0);
    let copyBallVector = ballVector.copy;
    let boundary;
    const cmrPosition = 15;
    // let keysPressedInterface: KeyPressed = {};
    let keysPressed = new Set();
    let leftPaddlePosition = 0;
    let rightPaddlePosition = 0;
    const paddleSpeed = 0.2;
    let restart = false;
    /**
     *
     * @param _event
     */
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize();
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        paddleLeft = createQuadComponent("PaddleLeft", material, new f.MeshQuad(), new f.Vector2(-7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleLeft);
        paddleRight = createQuadComponent("PaddleRight", material, new f.MeshQuad(), new f.Vector2(7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleRight);
        nodeBall = createQuadComponent("Ball", material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(0.2, 0.2));
        nodeRoot.appendChild(nodeBall);
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(cmrPosition);
        L05_.viewport = new f.Viewport();
        document.addEventListener("keydown", hndlKeyDown);
        document.addEventListener("keyup", hndlKeyUp);
        L05_.viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
        L05_.viewport.showSceneGraph();
        f.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        boundary = new f.Vector2(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        f.Loop.start();
        // viewport.draw();
    }
    function hndlKeyDown(_event) {
        keysPressed.add(_event.code);
        // keysPressedInterface[_event.code] = true;
    }
    function hndlKeyUp(_event) {
        keysPressed.delete(_event.code);
        // keysPressedInterface[_event.code] = false;
    }
    function ballMovement() {
        const xBallPosition = nodeBall.cmpTransform.local.translation.x;
        const yBallPosition = nodeBall.cmpTransform.local.translation.y;
        const xCalcBallBoundary = boundary.x / cmrPosition / 5;
        const yCalcBallBoundary = boundary.y / cmrPosition / 5;
        if (xBallPosition > xCalcBallBoundary ||
            xBallPosition < -xCalcBallBoundary) {
            ballVector.x = -xBallPosition;
            ballVector.y = -yBallPosition;
        }
        // ballVector.x = -ballVector.x;
        if (yBallPosition > yCalcBallBoundary || yBallPosition < -yCalcBallBoundary)
            ballVector.y = -ballVector.y;
    }
    function update(_event) {
        const cmpPaddleLeft = paddleLeft.cmpTransform.local;
        const cmpPaddleRight = paddleRight.cmpTransform.local;
        const yBallPosition = nodeBall.cmpTransform.local.translation.y;
        const yPaddleBoundary = boundary.x / cmrPosition / 5 / 2;
        ballMovement();
        nodeBall.cmpTransform.local.translate(ballVector);
        // console.log(ballVector.x);
        // FIXME: Refactor into own Function
        // Collision detection
        if (leftPaddlePosition > yBallPosition - 2 &&
            leftPaddlePosition < yBallPosition + 2 &&
            nodeBall.cmpTransform.local.translation.x < -7)
            ballVector.x = -ballVector.x;
        if (rightPaddlePosition > yBallPosition - 2 &&
            rightPaddlePosition < yBallPosition + 2 &&
            nodeBall.cmpTransform.local.translation.x > 7)
            ballVector.x = -ballVector.x;
        if (keysPressed.has(f.KEYBOARD_CODE.W) &&
            leftPaddlePosition < yPaddleBoundary) {
            cmpPaddleLeft.translateY(paddleSpeed);
            leftPaddlePosition += paddleSpeed;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.S) &&
            leftPaddlePosition > -yPaddleBoundary) {
            cmpPaddleLeft.translateY(-paddleSpeed);
            leftPaddlePosition -= paddleSpeed;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) &&
            rightPaddlePosition < yPaddleBoundary) {
            cmpPaddleRight.translateY(paddleSpeed);
            rightPaddlePosition += paddleSpeed;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
            rightPaddlePosition > -yPaddleBoundary) {
            cmpPaddleRight.translateY(-paddleSpeed);
            rightPaddlePosition -= paddleSpeed;
        }
        f.RenderManager.update();
        L05_.viewport.draw();
    }
    /**
     *
     * @param _nameNode
     * @param _material
     * @param _mesh
     * @param _pos
     * @param _scale
     */
    function createQuadComponent(_nameNode, _material, _mesh, _pos, _scale) {
        const node = new f.Node(_nameNode);
        const cmpMesh = new f.ComponentMesh(_mesh);
        const cmpMaterial = new f.ComponentMaterial(_material);
        // transform _scale and _pos to Vector3 so it can be more easily used for local.translate
        const scale = new f.Vector3(_scale.x, _scale.y, 0);
        const pos = new f.Vector3(_pos.x, _pos.y, 0);
        cmpMesh.pivot.scale(scale);
        node.addComponent(cmpMesh);
        node.addComponent(cmpMaterial);
        node.addComponent(new f.ComponentTransform());
        node.cmpTransform.local.translate(pos);
        return node;
    }
})(L05_ || (L05_ = {}));
//# sourceMappingURL=Main.js.map