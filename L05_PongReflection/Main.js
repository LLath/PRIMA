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
    const PADDLE_POSITION_X = 7;
    const PADDLE_HEIGHT = 3;
    // let keysPressedInterface: KeyPressed = {};
    let keysPressed = new Set();
    window.addEventListener("load", hndLoad);
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        f.RenderManager.initialize();
        // Create material and nodes --------------------------------------------------------------------------------------
        createObjects();
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
    }
    function createObjects() {
        let material = new f.Material("SolidWhite", f.ShaderUniColor, new f.CoatColored(f.Color.WHITE));
        paddleLeft = createQuadComponent(paddleLeft.name, material, new f.MeshQuad(), new f.Vector2(-PADDLE_POSITION_X, 0), new f.Vector2(0.05, PADDLE_HEIGHT));
        nodeRoot.appendChild(paddleLeft);
        paddleRight = createQuadComponent(paddleRight.name, material, new f.MeshQuad(), new f.Vector2(PADDLE_POSITION_X, 0), new f.Vector2(0.05, PADDLE_HEIGHT));
        nodeRoot.appendChild(paddleRight);
        nodeBall = createQuadComponent(nodeBall.name, material, new f.MeshQuad(), new f.Vector2(0, 0), new f.Vector2(BALL_SIZE, BALL_SIZE));
        nodeRoot.appendChild(nodeBall);
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
    function boundaryDetection(_node) {
        const nodeLocal = _node.cmpTransform.local;
        const canvas = document.querySelector("canvas");
        boundary = new f.Vector2(canvas.clientWidth, canvas.clientHeight);
        const nodeScaling = nodeLocal.scaling;
        const xPosition = nodeLocal.translation.x;
        const yPosition = nodeLocal.translation.y;
        const xBoundary = (boundary.x / CAMERA_POSITION) * nodeScaling.x;
        const yBoundary = (boundary.y / CAMERA_POSITION) * nodeScaling.y - nodeScaling.y;
        if (xPosition > xBoundary || xPosition < -xBoundary) {
            // const player: string = xBallPosition > 0 ? "1" : "2";
            // alert(`Point for Player ${player}`);
            // window.location.reload();
            // ballVector.x = -ballVector.x;
        }
        if (yPosition > yBoundary || yPosition < -yBoundary)
            ballVector.y = -ballVector.y;
    }
    /**
     * Controls W,S,ARROW_UP and ARROW_DOWN to move paddles
     */
    function keyBoardControl(_player1, _player2) {
        console.log(_player1.translation.y);
        const yBoundary = boundary.y / CAMERA_POSITION / _player1.scaling.y - _player1.scaling.y;
        // Player 1 W and S
        if (keysPressed.has(f.KEYBOARD_CODE.W) && leftPaddlePosition < yBoundary) {
            _player1.translateY(PADDLE_SPEED);
            leftPaddlePosition += PADDLE_SPEED;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.S) && leftPaddlePosition > -yBoundary) {
            _player1.translateY(-PADDLE_SPEED);
            leftPaddlePosition -= PADDLE_SPEED;
        }
        // Player 2 ARROW_UP and ARROW_DOWN
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) &&
            rightPaddlePosition < yBoundary) {
            _player2.translateY(PADDLE_SPEED);
            rightPaddlePosition += PADDLE_SPEED;
        }
        if (keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
            rightPaddlePosition > -yBoundary) {
            _player2.translateY(-PADDLE_SPEED);
            rightPaddlePosition -= PADDLE_SPEED;
        }
    }
    function hitDetection(_node) {
        const yPosition = _node.cmpTransform.local.translation.y;
        const paddleHeight = PADDLE_HEIGHT - 1.5;
        if (positionCheck(leftPaddlePosition, -PADDLE_POSITION_X)) {
            ballVector.x = -(ballVector.x - 0.02);
            if (leftPaddlePosition > yPosition - 2)
                ballVector.y = -ballVector.y;
        }
        if (positionCheck(rightPaddlePosition, PADDLE_POSITION_X))
            ballVector.x = -(ballVector.x + 0.02);
        function positionCheck(_position, _xPosition) {
            return (leftPaddlePosition - paddleHeight < yPosition + 1 &&
                leftPaddlePosition + paddleHeight > yPosition - 1 &&
                (_xPosition > 0
                    ? _node.cmpTransform.local.translation.x > _xPosition
                    : _node.cmpTransform.local.translation.x < _xPosition));
        }
    }
    function update(_event) {
        nodeBall.cmpTransform.local.translate(ballVector);
        boundaryDetection(nodeBall);
        keyBoardControl(paddleLeft.cmpTransform.local, paddleRight.cmpTransform.local);
        hitDetection(nodeBall);
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
        node.addComponent(cmpMesh);
        node.addComponent(cmpMaterial);
        node.addComponent(new f.ComponentTransform());
        node.cmpTransform.local.translate(pos);
        node.cmpTransform.local.scale(scale);
        return node;
    }
})(L05_Reflection || (L05_Reflection = {}));
//# sourceMappingURL=Main.js.map