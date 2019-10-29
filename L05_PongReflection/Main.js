"use strict";
var L05_Reflection;
(function (L05_Reflection) {
    // interface KeyPressed {
    //   [code: string]: boolean;
    // }
    var f = FudgeCore;
    // Initializing nodes ---------------------------------------------------------------------------------------------
    let paddleLeft = new f.Node("PaddleLeft");
    let paddleRight = new f.Node("PaddleRight");
    let nodeBall = new f.Node("Ball");
    let nodeRoot = new f.Node("Root");
    // Decleration of Vectors -------------------------------------------------------------------------------------------
    let ballVector = new f.Vector3((Math.random() * 2 - 1) / 5, (Math.random() * 2 - 1) / 5, 0);
    let boundary;
    let leftPaddlePosition = 0;
    let rightPaddlePosition = 0;
    // Constants --------------------------------------------------------------------------------------------------------
    const CAMERA_POSITION = 15;
    const PADDLE_SPEED = 0.2;
    const BALL_SIZE = 0.2;
    // let keysPressedInterface: KeyPressed = {};
    let keysPressed = new Set();
    window.addEventListener("load", hndLoad);
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        boundary = new f.Vector2(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
        f.RenderManager.initialize();
        // Create material and nodes --------------------------------------------------------------------------------------
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        paddleLeft = createQuadComponent("PaddleLeft", material, new f.MeshQuad(), new f.Vector2(-7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleLeft);
        paddleRight = createQuadComponent("PaddleRight", material, new f.MeshQuad(), new f.Vector2(7, 0), new f.Vector2(0.05, 3));
        nodeRoot.appendChild(paddleRight);
        nodeBall = createQuadComponent("Ball", material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(BALL_SIZE, BALL_SIZE));
        nodeRoot.appendChild(nodeBall);
        // Camera controls ------------------------------------------------------------------------------------------------
        let cmpCamera = new f.ComponentCamera();
        cmpCamera.pivot.translateZ(CAMERA_POSITION);
        L05_Reflection.viewport = new f.Viewport();
        // EventListeners -------------------------------------------------------------------------------------------------
        document.addEventListener("keydown", hndlKeyDown);
        document.addEventListener("keyup", hndlKeyUp);
        f.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
        L05_Reflection.viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);
        // Debug ----------------------------------------------------------------------------------------------------------
        L05_Reflection.viewport.showSceneGraph();
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
    /**
     * Ball collision with Walls
     * Changes x to -x / y to -y
     */
    function ballMovement() {
        const xBallPosition = nodeBall.cmpTransform.local.translation.x;
        const yBallPosition = nodeBall.cmpTransform.local.translation.y;
        const xCalcBallBoundary = (boundary.x / CAMERA_POSITION) * BALL_SIZE;
        const yCalcBallBoundary = (boundary.y / CAMERA_POSITION) * BALL_SIZE - BALL_SIZE;
        if (xBallPosition > xCalcBallBoundary ||
            xBallPosition < -xCalcBallBoundary) {
            const player = xBallPosition > 0 ? "1" : "2";
            alert(`Point for Player ${player}`);
            // window.location.reload();
            // ballVector.x = -ballVector.x;
        }
        if (yBallPosition > yCalcBallBoundary || yBallPosition < -yCalcBallBoundary)
            ballVector.y = -ballVector.y;
    }
    /**
     * Controls W,S,ARROW_UP and ARROW_DOWN to move paddles
     */
    function keyBoardControl() {
        const cmpPaddleLeft = paddleLeft.cmpTransform.local;
        const cmpPaddleRight = paddleRight.cmpTransform.local;
        const yPaddleBoundary = ((boundary.x / CAMERA_POSITION) * BALL_SIZE) / 2;
        if (keysPressed.has(f.KEYBOARD_CODE.W) &&
            leftPaddlePosition < yPaddleBoundary) {
            cmpPaddleLeft.translateY(PADDLE_SPEED);
            leftPaddlePosition += PADDLE_SPEED;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.S) &&
            leftPaddlePosition > -yPaddleBoundary) {
            cmpPaddleLeft.translateY(-PADDLE_SPEED);
            leftPaddlePosition -= PADDLE_SPEED;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) &&
            rightPaddlePosition < yPaddleBoundary) {
            cmpPaddleRight.translateY(PADDLE_SPEED);
            rightPaddlePosition += PADDLE_SPEED;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
            rightPaddlePosition > -yPaddleBoundary) {
            cmpPaddleRight.translateY(-PADDLE_SPEED);
            rightPaddlePosition -= PADDLE_SPEED;
        }
    }
    function collision() {
        const yBallPosition = nodeBall.cmpTransform.local.translation.y;
        if (leftPaddlePosition > yBallPosition - 2 &&
            leftPaddlePosition < yBallPosition + 2 &&
            nodeBall.cmpTransform.local.translation.x < -7)
            ballVector.x = -(ballVector.x - 0.02);
        if (rightPaddlePosition > yBallPosition - 2 &&
            rightPaddlePosition < yBallPosition + 2 &&
            nodeBall.cmpTransform.local.translation.x > 7)
            ballVector.x = -(ballVector.x + 0.02);
    }
    function update(_event) {
        nodeBall.cmpTransform.local.translate(ballVector);
        ballMovement();
        keyBoardControl();
        collision();
        // console.log(ballVector.x);
        f.RenderManager.update();
        L05_Reflection.viewport.draw();
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
})(L05_Reflection || (L05_Reflection = {}));
//# sourceMappingURL=Main.js.map