// namespace L05_Reflection {
//   // interface KeyPressed {
//   //   [code: string]: boolean;
//   // }

//   import f = FudgeCore;

//   export let viewport: f.Viewport;

//   // Initializing nodes ---------------------------------------------------------------------------------------------
//   let paddleLeft: f.Node = new f.Node("PaddleLeft");
//   let paddleRight: f.Node = new f.Node("PaddleRight");
//   let nodeBall: f.Node = new f.Node("Ball");
//   let nodeRoot: f.Node = new f.Node("Root");

//   // Decleration of Vectors -------------------------------------------------------------------------------------------
//   let ballVector: f.Vector3 = new f.Vector3(
//     (Math.random() * 2 - 1) / 5,
//     (Math.random() * 2 - 1) / 5,
//     0
//   );
//   let boundary: f.Vector2;

//   let leftPaddlePosition: number = 0;
//   let rightPaddlePosition: number = 0;
//   let score: number = 0;

//   // Constants --------------------------------------------------------------------------------------------------------
//   const CAMERA_POSITION: number = 15;
//   const PADDLE_SPEED: number = 0.2;
//   const BALL_SIZE: number = 0.2;
//   const PADDLE_POSITION_X: number = 7;
//   const PADDLE_HEIGHT: number = 3;

//   // let keysPressedInterface: KeyPressed = {};
//   let keysPressed: Set<string> = new Set();

//   window.addEventListener("load", hndLoad);

//   function hndLoad(_event: Event): void {
//     const canvas: HTMLCanvasElement = document.querySelector("canvas");
//     f.RenderManager.initialize();

//     // Create material and nodes --------------------------------------------------------------------------------------
//     createObjects();

//     // Camera controls ------------------------------------------------------------------------------------------------
//     let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
//     cmpCamera.pivot.translateZ(CAMERA_POSITION);
//     viewport = new f.Viewport();

//     // EventListeners -------------------------------------------------------------------------------------------------
//     document.addEventListener("keydown", hndlKeyDown);
//     document.addEventListener("keyup", hndlKeyUp);
//     f.Loop.addEventListener(f.EVENT.LOOP_FRAME, update);

//     viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);

//     // Debug ----------------------------------------------------------------------------------------------------------
//     viewport.showSceneGraph();

//     f.Loop.start();
//   }

//   function createObjects(): void {
//     let material: f.Material = new f.Material(
//       "SolidWhite",
//       f.ShaderUniColor,
//       new f.CoatColored(f.Color.WHITE)
//     );

//     paddleLeft = createQuadComponent(
//       paddleLeft.name,
//       material,
//       new f.MeshQuad(),
//       new f.Vector2(-PADDLE_POSITION_X, 0),
//       new f.Vector2(0.05, PADDLE_HEIGHT)
//     );
//     nodeRoot.appendChild(paddleLeft);

//     paddleRight = createQuadComponent(
//       paddleRight.name,
//       material,
//       new f.MeshQuad(),
//       new f.Vector2(PADDLE_POSITION_X, 0),
//       new f.Vector2(0.05, PADDLE_HEIGHT)
//     );
//     nodeRoot.appendChild(paddleRight);

//     nodeBall = createQuadComponent(
//       nodeBall.name,
//       material,
//       new f.MeshQuad(),
//       new f.Vector2(0, 0),
//       new f.Vector2(BALL_SIZE, BALL_SIZE)
//     );
//     nodeRoot.appendChild(nodeBall);

//     // Praktikum Collision abfrage
//     // Eingrenzen der Fläche mit Objekten
//     // Eckpunkte suchen, dann daraus die Kanten bilden

//     // Camera controls ------------------------------------------------------------------------------------------------
//     let cmpCamera: f.ComponentCamera = new f.ComponentCamera();
//     cmpCamera.pivot.translateZ(CAMERA_POSITION);
//     viewport = new f.Viewport();

//     // EventListeners -------------------------------------------------------------------------------------------------
//     document.addEventListener("keydown", hndlKeyDown);
//     document.addEventListener("keyup", hndlKeyUp);
//     f.Loop.addEventListener(f.EVENT.LOOP_FRAME, update);

//     viewport.initialize("Viewport", nodeRoot, cmpCamera, canvas);

//     // Debug ----------------------------------------------------------------------------------------------------------
//     viewport.showSceneGraph();

//     // INVERSION
//     let ctx: CanvasRenderingContext2D = canvas.getContext("2d");
//     ctx.lineWidth = 10;
//     ctx.fillText(score.toString(), 2, 1);
//     ctx.strokeRect(75, 140, 150, 110);
//     ctx.stroke();

//     f.Loop.start();
//   }

//   function hndlKeyDown(_event: KeyboardEvent): void {
//     keysPressed.add(_event.code);
//     // keysPressedInterface[_event.code] = true;
//   }
//   function hndlKeyUp(_event: KeyboardEvent): void {
//     keysPressed.delete(_event.code);
//     // keysPressedInterface[_event.code] = false;
//   }

//   /**
//    * Ball collision with Walls
//    * Changes x to -x / y to -y
//    */
//   function boundaryDetection(_node: f.Node): void {
//     const nodeLocal: f.Matrix4x4 = _node.cmpTransform.local;
//     const canvas: HTMLCanvasElement = document.querySelector("canvas");
//     boundary = new f.Vector2(canvas.clientWidth, canvas.clientHeight);

//     if (
//       xBallPosition > xCalcBallBoundary ||
//       xBallPosition < -xCalcBallBoundary
//     ) {
//       // score++;
//       ballVector.x = -ballVector.x;
//     }

//     if (yPosition > yBoundary || yPosition < -yBoundary)
//       ballVector.y = -ballVector.y;
//   }

//   /**
//    * Controls W,S,ARROW_UP and ARROW_DOWN to move paddles
//    */
// <<<<<<< HEAD
//   function keyBoardControl(_player1: f.Matrix4x4, _player2: f.Matrix4x4): void {
//     console.log(_player1.translation.y);
//     const yBoundary: number =
//       boundary.y / CAMERA_POSITION / _player1.scaling.y - _player1.scaling.y;

//     // Player 1 W and S
//     if (keysPressed.has(f.KEYBOARD_CODE.W) && leftPaddlePosition < yBoundary) {
//       _player1.translateY(PADDLE_SPEED);
// =======
//   function keybordControl(): void {
//     const cmpPaddleLeft: f.Matrix4x4 = paddleLeft.cmpTransform.local;
//     const cmpPaddleRight: f.Matrix4x4 = paddleRight.cmpTransform.local;
//     const yPaddleBoundary: number = ((boundary.x / CAMERA_POSITION) * BALL_SIZE) / 2;

//     if (
//       keysPressed.has(f.KEYBOARD_CODE.W) &&
//       leftPaddlePosition < yPaddleBoundary
//     ) {
//       cmpPaddleLeft.translateY(PADDLE_SPEED);
// >>>>>>> 5eb7a9d7de69e09d0408532efac2b86f19bda4bd
//       leftPaddlePosition += PADDLE_SPEED;
//     }
//     if (keysPressed.has(f.KEYBOARD_CODE.S) && leftPaddlePosition > -yBoundary) {
//       _player1.translateY(-PADDLE_SPEED);
//       leftPaddlePosition -= PADDLE_SPEED;
//     }

//     // Player 2 ARROW_UP and ARROW_DOWN
//     if (
//       keysPressed.has(f.KEYBOARD_CODE.ARROW_UP) &&
//       rightPaddlePosition < yBoundary
//     ) {
//       _player2.translateY(PADDLE_SPEED);
//       rightPaddlePosition += PADDLE_SPEED;
//     }
//     if (
//       keysPressed.has(f.KEYBOARD_CODE.ARROW_DOWN) &&
//       rightPaddlePosition > -yBoundary
//     ) {
//       _player2.translateY(-PADDLE_SPEED);
//       rightPaddlePosition -= PADDLE_SPEED;
//     }
//   }

// <<<<<<< HEAD
//   function hitDetection(_node: f.Node): void {
//     const yPosition: number = _node.cmpTransform.local.translation.y;
//     const paddleHeight: number = PADDLE_HEIGHT - 1.5;
// =======
//   function collision(): void {
//     const yBallPosition: number = nodeBall.cmpTransform.local.translation.y;
// >>>>>>> 5eb7a9d7de69e09d0408532efac2b86f19bda4bd

//     if (positionCheck(leftPaddlePosition, -PADDLE_POSITION_X)) {
//       ballVector.x = -(ballVector.x - 0.02);
//       if (leftPaddlePosition > yPosition - 2) ballVector.y = -ballVector.y;
//     }
//     if (positionCheck(rightPaddlePosition, PADDLE_POSITION_X))
//       ballVector.x = -(ballVector.x + 0.02);

//     function positionCheck(_position: number, _xPosition: number): boolean {
//       return (
//         leftPaddlePosition - paddleHeight < yPosition + 1 &&
//         leftPaddlePosition + paddleHeight > yPosition - 1 &&
//         (_xPosition > 0
//           ? _node.cmpTransform.local.translation.x > _xPosition
//           : _node.cmpTransform.local.translation.x < _xPosition)
//       );
//     }
//   }

//   function update(_event: Event): void {
//     nodeBall.cmpTransform.local.translate(ballVector);

// <<<<<<< HEAD
//     boundaryDetection(nodeBall);
//     keyBoardControl(
//       paddleLeft.cmpTransform.local,
//       paddleRight.cmpTransform.local
//     );
//     hitDetection(nodeBall);
// =======
//     ballMovement();
//     keybordControl();
//     collision();

//     document.querySelector("canvas").innerText = score.toString();

// >>>>>>> 5eb7a9d7de69e09d0408532efac2b86f19bda4bd

//     f.RenderManager.update();
//     viewport.draw();
//   }

//   /**
//    *
//    * @param _nameNode
//    * @param _material
//    * @param _mesh
//    * @param _pos
//    * @param _scale
//    */
//   function createQuadComponent(
//     _nameNode: string,
//     _material: f.Material,
//     _mesh: f.Mesh,
//     _pos: f.Vector2,
//     _scale: f.Vector2
//   ): f.Node {
//     const node: f.Node = new f.Node(_nameNode);
//     const cmpMesh: f.ComponentMesh = new f.ComponentMesh(_mesh);
//     const cmpMaterial: f.ComponentMaterial = new f.ComponentMaterial(_material);

//     // transform _scale and _pos to Vector3 so it can be more easily used for local.translate
//     const scale: f.Vector3 = new f.Vector3(_scale.x, _scale.y, 0);
//     const pos: f.Vector3 = new f.Vector3(_pos.x, _pos.y, 0);

// <<<<<<< HEAD
// =======

// >>>>>>> 5eb7a9d7de69e09d0408532efac2b86f19bda4bd
//     node.addComponent(cmpMesh);
//     node.addComponent(cmpMaterial);
//     node.addComponent(new f.ComponentTransform());
//     node.cmpTransform.local.translate(pos);
//     node.cmpTransform.local.scale(scale);
//     return node;
//   }
// }
