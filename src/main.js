import * as THREE from 'three'
import * as YUKA from 'yuka';
import * as CANNON from 'cannon-es';
import * as STATS from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { intersectionsForHeightmap } from "./800.js"
//import * as fs from 'fs';


class Main {
  constructor() {

    this.container;
    //this.stats;
    this.camera;
    this.scene;
    this.renderer;
    this.debug = true;
    this.debugPhysics = true;
    this.fixedTimeStep = 1.0 / 60.0;
    this.time = new YUKA.Time();

    this.viewMode = 1;

    this.container = document.createElement('div');
    this.container.style.height = '100%';
    document.body.appendChild(this.container);

    const game = this;

    this.js = { forward: 0, turn: 0 };
    this.clock = new THREE.Clock();

    this.init();

    window.onError = function (error) {
      console.error(JSON.stringify(error));
    }
  }

  modelLoader(fileName) {
    return new Promise((resolve, reject) => {
      this.loader.load(fileName, data => resolve(data), null, reject);
    });
  }

  async loadData(fileName, coord, scale, index) {
    const gltf = await modelLoader(fileName);
    let objet = gltf.scene.children[index];
    objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    scene.add(objet);

    return objet;
  }

  async loadFullData(fileName, coord, scale) {
    const gltf = await this.modelLoader(fileName);

    let objet = gltf.scene;
    objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    this.scene.add(objet);

    return objet;
  }

  createVehicle() {
    let game = this;

    const groundMaterial = new CANNON.Material("groundMaterial");
    const wheelMaterial = new CANNON.Material("wheelMaterial");
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
      friction: 0.5,
      restitution: 0,
      contactEquationStiffness: 1000
    });

    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(10 * this.numberItemLoaded, 4, 0);
    this.helper.addVisual(chassisBody, 'car');

    const options = {
      radius: 0.5,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 5,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    // Create the vehicle
    const vehicle = new CANNON.RaycastVehicle({
      chassisBody: chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indeForwardAxis: 2
    });

    options.chassisConnectionPointLocal.set(1, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(1, 0, 1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, 0, 1);
    vehicle.addWheel(options);

    vehicle.addToWorld(this.world);

    const wheelBodies = [];
    vehicle.wheelInfos.forEach(function (wheel) {
      const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius, 20);
      const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
      wheelBodies.push(wheelBody);
      game.helper.addVisual(wheelBody, 'wheel');
    });

    // Update wheels
    this.world.addEventListener('postStep', function () {
      let index = 0;
      game.vehicle.wheelInfos.forEach(function (wheel) {
        game.vehicle.updateWheelTransform(index);
        const t = wheel.worldTransform;
        wheelBodies[index].threemesh.position.copy(t.position);
        wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
        index++;
      });
    });

    this.carsCannon.push(vehicle);
  }

  initCars() {
    this.cars = [];
    this.carsCannon = [];
    this.carsInitPositions = [
      new THREE.Vector3(5, 150, 0), new THREE.Vector3(-5, 150, 0), new THREE.Vector3(5, 150, 5)
    ];
    this.turns = [
      0.2, -0.2, 0
    ];
  }


  init() {
    document.getElementById("restart").addEventListener("click", () => {
      this.retournerVoiture();
    });

    document.getElementById("changeView").addEventListener("click", () => {
      if (this.viewMode){
        this.viewMode = 0;
      }
      else {
        this.camera.position.set(this.voiture.position.x+1, this.voiture.position.y+2, this.voiture.position.z+1);
        this.viewMode = 1;
      }
    });

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.set(-100, 20, 10);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.listenToKeyEvents(window); // optional

    this.helper = new CannonHelper(this.scene);
    this.helper.addLights(this.renderer);

    window.addEventListener('resize', function () { this.onWindowResize(); }, false);

    /*
    const geometry = new THREE.CylinderGeometry(0.7, 0.7, 3);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.cylinder1 = new THREE.Mesh(geometry, material);
    this.cylinder2 = new THREE.Mesh(geometry, material);
    this.cylinder3 = new THREE.Mesh(geometry, material);
    */

    this.voiture = null;
    this.numberItemLoaded = 0;
    this.nbPingouins = 3;
    this.nbVoiture = 2;
    this.nbObject = this.nbVoiture + this.nbPingouins + 1;
    this.loader = new GLTFLoader().setPath('assets/models/');
    this.entityManager = new YUKA.EntityManager();

    this.initCars();

    this.initPhysics();

    this.loadFullData('scene.glb', new Vector3(0, 0, 0), new Vector3(10, 10, 10))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.cylinder1 = objet;
        this.scene.add(this.cylinder1);
        this.numberItemLoaded += 1;
      });
    
    this.loadFullData('scene.glb', new Vector3(0, 0, 0), new Vector3(10, 10, 10))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.cylinder2 = objet;
        this.scene.add(this.cylinder2);
        this.numberItemLoaded += 1;
      });

    this.loadFullData('scene.glb', new Vector3(0, 0, 0), new Vector3(10, 10, 10))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.cylinder3 = objet;
        this.scene.add(this.cylinder3);
        this.numberItemLoaded += 1;
      });

    this.intersections = [];
    this.sizeNb = 700;
    this.pasX = null;
    this.pasZ = null;
    let intersectionsExist = true;

    this.loadFullData('montmartre.glb', new Vector3(0, -150, 0), new Vector3(1, 1, 1))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        console.log("________test__________")
        this.boundingBox = objet.children[0].geometry.boundingBox;

        this.pas = Math.abs(this.boundingBox.min.x - this.boundingBox.max.x);
        if (!intersectionsExist){

          let raycasterPosition = new Vector3(this.boundingBox.min.x, 300, this.boundingBox.max.z);
          let indexObjet = 0;

          let raycasterDirection = new Vector3(0, -1, 0);
          const raycaster = new THREE.Raycaster(raycasterPosition, raycasterDirection);
          for (let i = 0; i < this.sizeNb; i++) {
            console.log(i);
            raycasterPosition.z = this.boundingBox.max.z;
            if (i != 0)
              raycasterPosition.x += (this.pas / this.sizeNb);
            this.intersections.push([]);
            for (let j = 0; j < this.sizeNb; j++) {
              if (j != 0)
                raycasterPosition.z -= (this.pas / this.sizeNb);
              raycaster.set(raycasterPosition, raycasterDirection);

              indexObjet = raycaster.intersectObject(objet).length;

              if (indexObjet) {
                let max = -999;
                raycaster.intersectObject(objet).forEach(obj => {
                  if (obj.point.y > max) {
                    max = obj.point.y
                  }
                })

                this.intersections[i].push(max);

                //console.log(raycaster.intersectObject(objet))

                const lineGeometry = new THREE.BufferGeometry().setFromPoints([raycasterPosition, new Vector3(raycasterPosition.x, max, raycasterPosition.z)]);
                let line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0x00FF00 }));
                this.scene.add(line);
              } else {
                this.intersections[i].push(50);

                const lineGeometry = new THREE.BufferGeometry().setFromPoints([raycasterPosition, new Vector3(raycasterPosition.x, raycasterDirection.y - 100, raycasterPosition.z)]);
                let line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xFF0000 }));
                this.scene.add(line);
              }
            }
            //console.log(JSON.stringify(this.intersections));
          }
          console.log(JSON.stringify(this.intersections));       
        } else {
          this.intersections = intersectionsForHeightmap;
        }

        var testHeightShape = new CANNON.Heightfield(this.intersections, {
          elementSize: this.pas / this.sizeNb

        });
        var testHeightBody = new CANNON.Body({ mass: 0 });
        testHeightBody.addShape(testHeightShape);
        testHeightBody.position.set(this.boundingBox.min.x , -150, this.boundingBox.max.z );
        testHeightBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI /2);

        this.world.addBody(testHeightBody);
        this.helper.addVisual(testHeightBody, 'test');

        //this.numberItemLoaded += 1;
      })



    this.loadFullData('voiture.glb', new Vector3(0, 250, 0), new Vector3(1, 1, 1))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.voiture = objet;

        this.numberItemLoaded += 1;
      });

    this.joystick = new JoyStick({
      game: this,
      onMove: this.joystickCallback
    });

    for (let i = 0; i < this.nbVoiture; i++) {
      this.loadFullData('voiture.glb', this.carsInitPositions[i], new Vector3(1, 1, 1))
        .catch(error => {
          console.error(error);
        })
        .then((objet) => {
          this.cars.push(objet);

          this.createVehicle();

          this.numberItemLoaded += 1;
        })
    }
  }

  retournerVoiture() {
    this.vehicle.chassisBody.applyForce(new Vector3(0, 2, 0), this.vehicle.chassisBody.position);
    //this.vehicle.chassisBody.quaternion.set(0, 0, 0, 0);

    this.cylinderBody1.applyForce(new Vector3(0, 2, 0), this.cylinderBody1.position);

    this.cylinderBody2.applyForce(new Vector3(0, 2, 0), this.cylinderBody2.position);

    this.cylinderBody3.applyForce(new Vector3(0, 2, 0), this.cylinderBody3.position);
    /*
    const wheelMaterial = new CANNON.Material("wheelMaterial");

    const wheelBodies = [];
    this.vehicle.wheelInfos.forEach(function (wheel) {
      const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius, 20);
      const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
      wheelBodies.push(wheelBody);
      this.helper.addVisual(wheelBody, 'wheel');
    });*/
  }

  initPhysics() {
    this.physics = {};

    const game = this;
    this.world = new CANNON.World();

    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.gravity.set(0, -10, 0);
    this.world.defaultContactMaterial.friction = 0;

    const groundMaterial = new CANNON.Material("groundMaterial");
    const wheelMaterial = new CANNON.Material("wheelMaterial");
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
      friction: 0.3,
      restitution: 0,
      contactEquationStiffness: 1000
    });

    // We must add the contact materials to the world
    this.world.addContactMaterial(wheelGroundContactMaterial);

    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(-110, -2, 0);
    this.helper.addVisual(chassisBody, 'car');

    this.followCam = new THREE.Object3D();
    this.followCam.position.copy(this.camera.position);
    this.scene.add(this.followCam);
    this.followCam.parent = chassisBody.threemesh;
    this.helper.shadowTarget = chassisBody.threemesh;

    const radiusTop = 0.2
    const radiusBottom = 0.2
    const height = 1
    const numSegments = 10

    const cylinderShape = new CANNON.Cylinder(radiusTop, radiusBottom, height, numSegments)
    this.cylinderBody1 = new CANNON.Body({ mass: 0.1, shape: cylinderShape })
    this.cylinderBody1.position.set(-110, -2, 10);
    this.world.addBody(this.cylinderBody1)
    this.helper.addVisual(this.cylinderBody1)

    this.cylinderBody2 = new CANNON.Body({ mass: 0.1, shape: cylinderShape })
    this.cylinderBody2.position.set(-100, -2, 0);
    this.world.addBody(this.cylinderBody2)
    this.helper.addVisual(this.cylinderBody2)

    this.cylinderBody3 = new CANNON.Body({ mass: 0.1, shape: cylinderShape })
    this.cylinderBody3.position.set(-110, -2, -10);
    this.world.addBody(this.cylinderBody3)
    this.helper.addVisual(this.cylinderBody3)

    const options = {
      radius: 0.5,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 5,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    // Create the vehicle
    const vehicle = new CANNON.RaycastVehicle({
      chassisBody: chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indeForwardAxis: 2
    });

    options.chassisConnectionPointLocal.set(1, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, 0, -1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(1, 0, 1);
    vehicle.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, 0, 1);
    vehicle.addWheel(options);

    vehicle.addToWorld(this.world);

    const wheelBodies = [];
    vehicle.wheelInfos.forEach(function (wheel) {
      const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius, 20);
      const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
      wheelBodies.push(wheelBody);
      game.helper.addVisual(wheelBody, 'wheel');
    });

    // Update wheels
    this.world.addEventListener('postStep', function () {
      let index = 0;
      game.vehicle.wheelInfos.forEach(function (wheel) {
        game.vehicle.updateWheelTransform(index);
        const t = wheel.worldTransform;
        wheelBodies[index].threemesh.position.copy(t.position);
        wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
        index++;
      });
    });

    this.vehicle = vehicle;
    this.camera.lookAt(-110, -2, 0);

    /*
    let matrix = [];
    let sizeX = 64, sizeY = 100;

    for (let i = 0; i < sizeX; i++) {
      matrix.push([]);
      for (var j = 0; j < sizeY; j++) {
        var height = 100+Math.cos(i / sizeX * Math.PI * 5) * Math.cos(j / sizeY * Math.PI * 5) * 2 + 2;
        if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeY - 1)
          height = 103;
        matrix[i].push(height);
      }
    }


    var hfShape = new CANNON.Heightfield(matrix, {
      elementSize: 100 / sizeX
    });
    var hfBody = new CANNON.Body({ mass: 0 });
    hfBody.addShape(hfShape);
    hfBody.position.set(-sizeX * hfShape.elementSize / 2, -4, sizeY * hfShape.elementSize / 2);
    hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(hfBody);
    this.helper.addVisual(hfBody, 'landscape');
    */

    this.animate();
  }

  joystickCallback(forward, turn) {
    this.js.forward = forward;
    this.js.turn = -turn;
  }

  updateDrive(vehicle = this.vehicle, forward = this.js.forward, turn = this.js.turn) {

    const maxSteerVal = 0.5;
    const maxForce = 1000;
    const brakeForce = 20;

    const force = maxForce * forward;
    const steer = maxSteerVal * turn;

    if (forward != 0) {
      vehicle.setBrake(0, 0);
      vehicle.setBrake(0, 1);
      vehicle.setBrake(0, 2);
      vehicle.setBrake(0, 3);

      vehicle.applyEngineForce(force, 2);
      vehicle.applyEngineForce(force, 3);
    } else {
      vehicle.setBrake(brakeForce, 0);
      vehicle.setBrake(brakeForce, 1);
      vehicle.setBrake(brakeForce, 2);
      vehicle.setBrake(brakeForce, 3);
    }

    vehicle.setSteeringValue(steer, 0);
    vehicle.setSteeringValue(steer, 1);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

  }

  updateCamera() {
    this.camera.position.lerp(this.followCam.getWorldPosition(new THREE.Vector3()), 0.05);
    this.camera.lookAt(this.vehicle.chassisBody.threemesh.position);
    if (this.helper.sun != undefined) {
      this.helper.sun.position.copy(this.camera.position);
      this.helper.sun.position.y += 10;
    }
  }

  animate() {
    const game = this;

    requestAnimationFrame(function () { game.animate(); });

    if (this.numberItemLoaded != this.nbObject) {
      return;
    }

    const now = Date.now();
    if (this.lastTime === undefined) this.lastTime = now;
    const dt = (Date.now() - this.lastTime) / 1000.0;
    this.FPSFactor = dt;
    this.lastTime = now;

    this.world.step(this.fixedTimeStep, dt);
    this.helper.updateBodies(this.world);

    //console.log(this.vehicle.chassisBody);
    this.cylinder1.position.set(
      this.cylinderBody1.position.x,
      this.cylinderBody1.position.y,
      this.cylinderBody1.position.z
    );
    this.cylinder2.position.set(
      this.cylinderBody2.position.x,
      this.cylinderBody2.position.y,
      this.cylinderBody2.position.z
    );
    this.cylinder3.position.set(
      this.cylinderBody3.position.x,
      this.cylinderBody3.position.y,
      this.cylinderBody3.position.z
    );
    this.cylinder1.quaternion.set(
      this.cylinderBody1.quaternion.x,
      this.cylinderBody1.quaternion.y,
      this.cylinderBody1.quaternion.z,
      this.cylinderBody1.quaternion.w
    );
    this.cylinder2.quaternion.set(
      this.cylinderBody2.quaternion.x,
      this.cylinderBody2.quaternion.y,
      this.cylinderBody2.quaternion.z,
      this.cylinderBody2.quaternion.w
    );
    this.cylinder3.quaternion.set(
      this.cylinderBody3.quaternion.x,
      this.cylinderBody3.quaternion.y,
      this.cylinderBody3.quaternion.z,
      this.cylinderBody3.quaternion.w
    );

    this.voiture.position.set(
      this.vehicle.chassisBody.position.x,
      this.vehicle.chassisBody.position.y - 0.8,
      this.vehicle.chassisBody.position.z
    )
    this.voiture.quaternion.set(
      this.vehicle.chassisBody.quaternion.x,
      this.vehicle.chassisBody.quaternion.y,
      this.vehicle.chassisBody.quaternion.z,
      this.vehicle.chassisBody.quaternion.w
    )

    this.voiture.rotateY(Math.PI);

    this.updateDrive();

    let index = 0;
    this.carsCannon.forEach(car => {
      this.updateDrive(car, 0.5, this.turns[index]);
      this.cars[index].position.set(
        car.chassisBody.position.x,
        car.chassisBody.position.y - 0.8,
        car.chassisBody.position.z
      )
      this.cars[index].quaternion.set(
        car.chassisBody.quaternion.x,
        car.chassisBody.quaternion.y,
        car.chassisBody.quaternion.z,
        car.chassisBody.quaternion.w
      )
      this.cars[index].rotateY(Math.PI);
      index += 1;
    });

    if (this.viewMode) {
      this.updateCamera();
      this.controls.enabled = false;
    } else {
      this.controls.enabled = true;
    }

    this.renderer.render(this.scene, this.camera);

    //if (this.stats != undefined) this.stats.update();
  }
}

class JoyStick {
  constructor(options) {
    const circle = document.createElement("div");
    circle.style.cssText = "position:absolute; bottom:35px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; left:50%; transform:translateX(-50%);";
    const thumb = document.createElement("div");
    thumb.style.cssText = "position: absolute; left: 20px; top: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff;";
    circle.appendChild(thumb);
    document.body.appendChild(circle);
    this.domElement = thumb;
    this.maxRadius = options.maxRadius || 40;
    this.maxRadiusSquared = this.maxRadius * this.maxRadius;
    this.onMove = options.onMove;
    this.game = options.game;
    this.origin = { left: this.domElement.offsetLeft, top: this.domElement.offsetTop };
    this.rotationDamping = options.rotationDamping || 0.06;
    this.moveDamping = options.moveDamping || 0.01;
    if (this.domElement != undefined) {
      const joystick = this;
      if ('ontouchstart' in window) {
        this.domElement.addEventListener('touchstart', function (evt) { joystick.tap(evt); });
      } else {
        this.domElement.addEventListener('mousedown', function (evt) { joystick.tap(evt); });
      }
    }
  }

  getMousePosition(evt) {
    let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
    let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
    return { x: clientX, y: clientY };
  }

  tap(evt) {
    evt = evt || window.event;
    // get the mouse cursor position at startup:
    this.offset = this.getMousePosition(evt);
    const joystick = this;
    if ('ontouchstart' in window) {
      document.ontouchmove = function (evt) { joystick.move(evt); };
      document.ontouchend = function (evt) { joystick.up(evt); };
    } else {
      document.onmousemove = function (evt) { joystick.move(evt); };
      document.onmouseup = function (evt) { joystick.up(evt); };
    }
  }

  move(evt) {
    evt = evt || window.event;
    const mouse = this.getMousePosition(evt);
    // calculate the new cursor position:
    let left = mouse.x - this.offset.x;
    let top = mouse.y - this.offset.y;
    //this.offset = mouse;

    const sqMag = left * left + top * top;
    if (sqMag > this.maxRadiusSquared) {
      //Only use sqrt if essential
      const magnitude = Math.sqrt(sqMag);
      left /= magnitude;
      top /= magnitude;
      left *= this.maxRadius;
      top *= this.maxRadius;
    }
    // set the element's new position:
    this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
    this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;

    const forward = -(top - this.origin.top + this.domElement.clientHeight / 2) / this.maxRadius;
    const turn = (left - this.origin.left + this.domElement.clientWidth / 2) / this.maxRadius;

    if (this.onMove != undefined) this.onMove.call(this.game, forward, turn);
  }

  up(evt) {
    if ('ontouchstart' in window) {
      document.ontouchmove = null;
      document.touchend = null;
    } else {
      document.onmousemove = null;
      document.onmouseup = null;
    }
    this.domElement.style.top = `${this.origin.top}px`;
    this.domElement.style.left = `${this.origin.left}px`;

    this.onMove.call(this.game, 0, 0);
  }
}

class CannonHelper {
  constructor(scene) {
    this.scene = scene;
  }

  addLights(renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    // LIGHTS
    const ambient = new THREE.AmbientLight(0x888888);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight(0xdddddd);
    light.position.set(3, 10, 4);
    light.target.position.set(0, 0, 0);

    light.castShadow = true;

    const lightSize = 10;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    this.sun = light;
    this.scene.add(light);
  }

  set shadowTarget(obj) {
    if (this.sun !== undefined) this.sun.target = obj;
  }

  createCannonTrimesh(geometry) {
    if (!geometry.isBufferGeometry) return null;

    const posAttr = geometry.attributes.position;
    const vertices = geometry.attributes.position.array;
    let indices = [];
    for (let i = 0; i < posAttr.count; i++) {
      indices.push(i);
    }

    return new CANNON.Trimesh(vertices, indices);
  }

  createCannonConvex(geometry) {
    if (!geometry.isBufferGeometry) return null;

    const posAttr = geometry.attributes.position;
    const floats = geometry.attributes.position.array;
    const vertices = [];
    const faces = [];
    let face = [];
    let index = 0;
    for (let i = 0; i < posAttr.count; i += 3) {
      vertices.push(new CANNON.Vec3(floats[i], floats[i + 1], floats[i + 2]));
      face.push(index++);
      if (face.length == 3) {
        faces.push(face);
        face = [];
      }
    }

    return new CANNON.ConvexPolyhedron(vertices, faces);
  }

  addVisual(body, name, castShadow = true, receiveShadow = true) {
    body.name = name;
    if (this.currentMaterial === undefined) this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0x525252, visible: false });
    if (this.settings === undefined) {
      this.settings = {
        stepFrequency: 60,
        quatNormalizeSkip: 2,
        quatNormalizeFast: true,
        gx: 0,
        gy: 0,
        gz: 0,
        iterations: 3,
        tolerance: 0.0001,
        k: 1e6,
        d: 3,
        scene: 0,
        paused: false,
        rendermode: "solid",
        constraints: false,
        contacts: false,  // Contact points
        cm2contact: false, // center of mass to contact points
        normals: false, // contact normals
        axes: false, // "local" frame axes
        particleSize: 0.1,
        shadows: false,
        aabbs: false,
        profiling: false,
        maxSubSteps: 3
      }
      this.particleGeo = new THREE.SphereGeometry(1, 16, 8);
      this.particleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    }
    // What geometry should be used?
    let mesh;
    if (body instanceof CANNON.Body) mesh = this.shape2Mesh(body, castShadow, receiveShadow);

    if (mesh) {
      // Add body
      body.threemesh = mesh;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      this.scene.add(mesh);
    }
  }

  shape2Mesh(body, castShadow, receiveShadow) {
    const obj = new THREE.Object3D();
    const material = this.currentMaterial;
    const game = this;
    let index = 0;

    body.shapes.forEach(function (shape) {
      let mesh;
      let geometry;
      let v0, v1, v2;

      switch (shape.type) {

        case CANNON.Shape.types.CYLINDER:
          const cylinder_geometry = new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.radius);
          cylinder_geometry.rotateX(Math.PI / 2);
          mesh = new THREE.Mesh(cylinder_geometry, material);
          break;

        case CANNON.Shape.types.SPHERE:
          const sphere_geometry = new THREE.SphereGeometry(shape.radius, 8, 8);
          mesh = new THREE.Mesh(sphere_geometry, material);
          break;

        case CANNON.Shape.types.PARTICLE:
          mesh = new THREE.Mesh(game.particleGeo, game.particleMaterial);
          const s = this.settings;
          mesh.scale.set(s.particleSize, s.particleSize, s.particleSize);
          break;

        case CANNON.Shape.types.PLANE:
          geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
          mesh = new THREE.Object3D();
          const submesh = new THREE.Object3D();
          const ground = new THREE.Mesh(geometry, material);
          ground.scale.set(100, 100, 100);
          submesh.add(ground);

          mesh.add(submesh);
          break;

        case CANNON.Shape.types.BOX:
          const box_geometry = new THREE.BoxGeometry(shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2);
          mesh = new THREE.Mesh(box_geometry, material);
          break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
          const geo = new THREE.BufferGeometry();

          // Add vertices
          shape.vertices.forEach(function (v) {
            geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
          });

          shape.faces.forEach(function (face) {
            // add triangles
            const a = face[0];
            for (let j = 1; j < face.length - 1; j++) {
              const b = face[j];
              const c = face[j + 1];
              geo.faces.push(new THREE.Face3(a, b, c));
            }
          });
          geo.computeBoundingSphere();
          geo.computeFaceNormals();
          mesh = new THREE.Mesh(geo, material);
          break;

        case CANNON.Shape.types.HEIGHTFIELD:
          geometry = new THREE.BufferGeometry();

          //geometry.deleteAttribute('normal');
          //geometry.deleteAttribute('uv');

          geometry.computeVertexNormals();

          v0 = new CANNON.Vec3();
          v1 = new CANNON.Vec3();
          v2 = new CANNON.Vec3();

          let listPos = [];
          let listColors = [];

          for (let xi = 0; xi < shape.data.length - 1; xi++) {
            for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
              for (let k = 0; k < 2; k++) {
                shape.getConvexTrianglePillar(xi, yi, k === 0);
                v0.copy(shape.pillarConvex.vertices[0]);
                v1.copy(shape.pillarConvex.vertices[1]);
                v2.copy(shape.pillarConvex.vertices[2]);
                v0.vadd(shape.pillarOffset, v0);
                v1.vadd(shape.pillarOffset, v1);
                v2.vadd(shape.pillarOffset, v2);

                listPos.push(v0.x);
                listPos.push(v0.y);
                listPos.push(v0.z);
                listPos.push(v1.x);
                listPos.push(v1.y);
                listPos.push(v1.z);
                listPos.push(v2.x);
                listPos.push(v2.y);
                listPos.push(v2.z);

                listColors.push(0.5);
                listColors.push(0.5);
                listColors.push(0.5);
                listColors.push(0.2);
                listColors.push(0.2);
                listColors.push(0.2);
                listColors.push(0.9);
                listColors.push(0.9);
                listColors.push(0.9);

                /*
                                listPos.push(new THREE.Vector3(v0.x, v0.y, v0.z));
                                listPos.push(new THREE.Vector3(v1.x, v1.y, v1.z));
                                listPos.push(new THREE.Vector3(v2.x, v2.y, v2.z));*/
              }
            }
          }

          const vertices = new Float32Array(
            listPos
          );

          const colorVertices = new Float32Array(
            listColors
          );

          // itemSize = 3 because there are 3 values (components) per vertex
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          geometry.setAttribute('color', new THREE.BufferAttribute(colorVertices, 3));

          geometry.computeBoundingSphere();
          geometry.computeBoundingBox();
          //geometry.computeTangents();

          //geometry.computeFaceNormals();

          //geometry = new ConvexGeometry(listPos);

          //mesh = new THREE.Mesh(geometry, material);

          mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x525252, visible: false }));

          break;

        case CANNON.Shape.types.TRIMESH:
          geometry = new THREE.BoxGeometry();

          geometry.deleteAttribute('normal');
          geometry.deleteAttribute('uv');

          geometry = BufferGeometryUtils.mergeVertices(geometry);
          geometry.computeVertexNormals();

          v0 = new CANNON.Vec3();
          v1 = new CANNON.Vec3();
          v2 = new CANNON.Vec3();

          for (let i = 0; i < shape.indices.length / 3; i++) {
            shape.getTriangleVertices(i, v0, v1, v2);
            let position = geometry.attributes.position;
            position.setXYZ(i * 3, v0.x, v0.y, v0.z);
            position.setXYZ(i * 3 + 1, v0.x, v0.y, v0.z);
            position.setXYZ(i * 3 + 2, v0.x, v0.y, v0.z);
          }
          geometry.computeBoundingSphere();
          //geometry.computeFaceNormals();
          mesh = new THREE.Mesh(geometry, MutationRecordaterial);
          break;

        default:
          throw "Visual type not recognized: " + shape.type;
      }

      mesh.receiveShadow = receiveShadow;
      mesh.castShadow = castShadow;

      mesh.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
        }
      });
      /*
      if (this.viewMode) {
        var o = body.shapeOffsets[indeaddVisualx];
        var q = body.shapeOrientations[index++];
        mesh.position.set(o.x, o.y, o.z);
        mesh.quaternion.set(q.x, q.y, q.z, q.w);
      }*/

      obj.add(mesh);
    });

    return obj;
  }

  updateBodies(world) {
    world.bodies.forEach(function (body) {
      if (body.threemesh != undefined) {
        body.threemesh.position.copy(body.position);
        body.threemesh.quaternion.copy(body.quaternion);
      }
    });
  }


}

new Main();
