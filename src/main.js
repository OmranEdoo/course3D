import * as THREE from 'three'
import * as YUKA from 'yuka';
import * as CANNON from 'cannon-es';
//import * as STATS from 'stats.js'
//import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';

class Main {
  constructor() {
    console.log("constructor");

    this.container;
		//this.stats = null;
		this.camera;
		this.scene;
		this.renderer;
		this.debug = true;
		this.debugPhysics = true;
		this.fixedTimeStep = 1.0/60.0;
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const game = this;
		
		this.js = { forward:0, turn:0 };
		this.clock = new THREE.Clock();
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}

    this.keys = {
      a: false,
      s: false,
      d: false,
      w: false
    };

    this.voiture = null;
    this.goal = null;
    this.circuit = null;

    this.entityManager = new YUKA.EntityManager();
    this.numberItemLoaded = 0;
    this.voitures = [];
    this.voituresCannon = [];
  
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    })

    this.dir = new THREE.Vector3;
    this.a = new THREE.Vector3;
    this.b = new THREE.Vector3;
    this.coronaSafetyDistance = 10;
    this.velocity = 0.0;
    this.speed = 0.0;

    this.time = new YUKA.Time();
    this.positions1 = [];
    this.positions2 = [];
    this.positions3 = [];
    this.positions4 = [];

    this.nbVoiture = 4;
    this.nbItems = this.nbVoiture + 1;

    this.axisX = new CANNON.Vec3(1, 0, 0);
    this.axisY = new CANNON.Vec3(0, 1, 0);
    this.axisZ = new CANNON.Vec3(0, 0, 1);

    this.angle = 0.04;

    this.cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))

    this.voituresPositions = [
      new Vector3(5, 0, 0),
      new Vector3(10, 0, 0),
      new Vector3(-5, 0, 0),
      new Vector3(-10, 0, 0)
    ];

    this.init();
  }

  modelLoader(fileName) {
    return new Promise((resolve, reject) => {
      this.loader.load(fileName, data => resolve(data), null, reject);
    });
  }

  async loadData(fileName, coord, scale, index) {
    const gltf = await this.modelLoader(fileName);
    //console.log(gltf.scene);
    let objet = gltf.scene.children[index];
    objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    console.log("objet");
    console.log(objet.matrixWorld);
    this.scene.add(objet);

    return objet;
  }

  async loadFullData(fileName, coord, scale) {
    const gltf = await this.modelLoader(fileName);

    let objet = gltf.scene;
    objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    console.log("objet");
    console.log(objet.matrixWorld);
    this.scene.add(objet);

    return objet;
  }

  init() {
    const game = this;

    this.loader = new GLTFLoader().setPath('assets/models/');

    // Initialisation des éléments principaux
    this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.set( 10, 10, 10 );

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );

    this.helper = new CannonHelper(this.scene);
    this.helper.addLights(this.renderer);

    window.addEventListener( 'resize', function(){ game.onWindowResize(); }, false );

    this.camera.position.set(0, 4.0, 0);

    this.camera.lookAt(this.scene.position);

    this.goal = new THREE.Object3D;
    //follow = new THREE.Object3D;
    this.goal.position.z = -this.coronaSafetyDistance;
    this.goal.add(this.camera);

    this.gridHelper = new THREE.GridHelper(100, 100);
    this.scene.add(this.gridHelper);

    this.planeShape = new CANNON.Plane();
    this.planeBody = new CANNON.Body({ mass: 0 });
    this.planeBody.addShape(this.planeShape);
    this.planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.planeBody);

    this.scene.add(new THREE.AxesHelper());

    document.body.appendChild(this.renderer.domElement);
/*
    // Contrôle de la caméra avec la souris et les flèches directionnelles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.listenToKeyEvents(window); // optional
*/
    // Lumières
    this.ambientLight = new THREE.AmbientLight(0x333333);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    this.directionalLight.position.set(0, 10, 10);
    this.scene.add(this.directionalLight);

    this.paths = [];

    this.path1 = new YUKA.Path();
    this.path1.add(new YUKA.Vector3(50, 0, 0));
    this.path1.add(new YUKA.Vector3(0, 0, 0));
    this.path1.add(new YUKA.Vector3(0, 0, 50));

    this.path2 = new YUKA.Path();
    this.path2.add(new YUKA.Vector3(-50, 0, -25));
    this.path2.add(new YUKA.Vector3(20, 0, 10));
    this.path2.add(new YUKA.Vector3(40, 0, 40));

    this.path3 = new YUKA.Path();
    this.path3.add(new YUKA.Vector3(40, 0, -40));
    this.path3.add(new YUKA.Vector3(-20, 0, -10));
    this.path3.add(new YUKA.Vector3(5, 0, 40));

    this.path4 = new YUKA.Path();
    this.path4.add(new YUKA.Vector3(25, 0, 25));
    this.path4.add(new YUKA.Vector3(-25, 0, 25));
    this.path4.add(new YUKA.Vector3(-25, 0, -25));
    this.path4.add(new YUKA.Vector3(25, 0, -25));


    this.path1.loop = true;
    this.path2.loop = true;
    this.path3.loop = true;
    this.path4.loop = true;

    this.paths.push(this.path1);
    this.paths.push(this.path2);
    this.paths.push(this.path3);
    this.paths.push(this.path4);


    for (let i = 0; i < this.path1._waypoints.length; i++) {
      const point = this.path1._waypoints[i];
      this.positions1.push(point.x, point.y, point.z);
    }
    for (let i = 0; i < this.path2._waypoints.length; i++) {
      const point = this.path2._waypoints[i];
      this.positions2.push(point.x, point.y, point.z);
    }
    for (let i = 0; i < this.path3._waypoints.length; i++) {
      const point = this.path3._waypoints[i];
      this.positions3.push(point.x, point.y, point.z);
    }
    for (let i = 0; i < this.path4._waypoints.length; i++) {
      const point = this.path4._waypoints[i];
      this.positions4.push(point.x, point.y, point.z);
    }

    this.positions = [this.positions1, this.positions2, this.positions2, this.positions4]

    this.lineGeometry1 = new THREE.BufferGeometry();
    this.lineGeometry2 = new THREE.BufferGeometry();
    this.lineGeometry3 = new THREE.BufferGeometry();
    this.lineGeometry4 = new THREE.BufferGeometry();

    this.lineGeometrys = [this.lineGeometry1, this.lineGeometry2, this.lineGeometry3, this.lineGeometry4]

    for (let i = 0; i < this.nbVoiture; i++) {
      this.lineGeometrys[i].setAttribute('position', new THREE.Float32BufferAttribute(this.positions[i], 3));
    }

    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });

    this.lines1 = new THREE.LineLoop(this.lineGeometry1, this.lineMaterial);
    this.lines2 = new THREE.LineLoop(this.lineGeometry2, this.lineMaterial);
    this.lines3 = new THREE.LineLoop(this.lineGeometry3, this.lineMaterial);
    this.lines4 = new THREE.LineLoop(this.lineGeometry4, this.lineMaterial);

    this.scene.add(this.lines1);
    this.scene.add(this.lines2);
    this.scene.add(this.lines3);
    this.scene.add(this.lines4);

    console.log("lines4");
    console.log(this.lines4.matrixWorld);


    /*
    if (this.debug){
			this.stats = new Stats();
			this.container.appendChild( this.stats.dom );
		}*/

    this.joystick = new JoyStick({
			game:this,
			onMove:this.joystickCallback
		});
        
    function sync(entity, renderComponent) {
      //console.log("____test____");
      renderComponent.matrix.copy(entity.worldMatrix);
    }

    this.loadData('roads.glb', new Vector3(0, 0, 0), new Vector3(4, 4, 4), 0)
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.circuit = objet;
        this.numberItemLoaded += 1;
      });

      this.loadFullData('voiture.glb', new Vector3(0, 10, 0), new Vector3(1, 1, 1))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        this.voiture = objet;/*
        this.voitureCannon = new CANNON.Body({ mass: 1 });
        this.voitureCannon.addShape(this.cubeShape);
        this.voitureCannon.position.x = this.voiture.position.x;
        this.voitureCannon.position.y = this.voiture.position.y;
        this.voitureCannon.position.z = this.voiture.position.z;
        this.world.addBody(this.voitureCannon);*/

        this.numberItemLoaded += 1;
      });

    for (let i = 0; i < this.nbVoiture; i++) {
      this.loadFullData('voiture.glb', this.voituresPositions[i], new Vector3(1, 1, 1))
        .catch(error => {
          console.error(error);
        })
        .then((objet) => {
          var vehicle = new YUKA.Vehicle();
          vehicle.position.copy(this.paths[i].current());
          vehicle.maxSpeed = 7;

          const followPathBehavior = new YUKA.FollowPathBehavior(this.paths[i], 10);
          vehicle.steering.add(followPathBehavior);

          const onPathBehavior = new YUKA.OnPathBehavior(this.paths[i]);
          //onPathBehavior.radius = 2;
          vehicle.steering.add(onPathBehavior);

          this.entityManager.add(vehicle);

          //objet.matrixAutoUpdate = false;
          //vehicle.setRenderComponent(objet, sync);

          let cubeBody = new CANNON.Body({ mass: 1 })
          cubeBody.addShape(this.cubeShape)
          cubeBody.position.x = vehicle.position.x
          cubeBody.position.y = vehicle.position.y
          cubeBody.position.z = vehicle.position.z
          this.world.addBody(cubeBody)

          this.numberItemLoaded += 1;
          this.voitures.push(vehicle);
          this.voituresCannon.push(cubeBody);
        })
    }
    /*
    // Listener des touches "qzsd" (wasd en qwerty)
    document.body.addEventListener('keydown', function (e) {
      var key = e.code.replace('Key', '').toLowerCase();
      if (this.keys[key] !== undefined)
        this.keys[key] = true;
    });

    document.body.addEventListener('keyup', function (e) {
      var key = e.code.replace('Key', '').toLowerCase();
      if (this.keys[key] !== undefined)
        this.keys[key] = false;
    });*/

    this.initPhysics();
  }

  initPhysics(){
		this.physics = {};
		
		const game = this;
        const world = new CANNON.World();
		this.world = world;
		
		world.broadphase = new CANNON.SAPBroadphase(world);
		world.gravity.set(0, -10, 0);
		world.defaultContactMaterial.friction = 0;

		const groundMaterial = new CANNON.Material("groundMaterial");
		const wheelMaterial = new CANNON.Material("wheelMaterial");
		const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
			friction: 0.3,
			restitution: 0,
			contactEquationStiffness: 1000
		});

		// We must add the contact materials to the world
		world.addContactMaterial(wheelGroundContactMaterial);

		const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
		const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
		chassisBody.addShape(chassisShape);
		chassisBody.position.set(0, 4, 0);
		this.helper.addVisual(chassisBody, 'car');
		
		this.followCam = new THREE.Object3D();
		this.followCam.position.copy(this.camera.position);
		this.scene.add(this.followCam);
		this.followCam.parent = chassisBody.threemesh;
    this.helper.shadowTarget = chassisBody.threemesh;

		const options = {
			radius: 0.5,
			directionLocal: new CANNON.Vec3(0, -1, 0),
			suspensionStiffness: 30,
			suspensionRestLength: 0.3,
			frictionSlip: 5,
			dampingRelaxation: 2.3,
			dampingCompression: 4.4,
			maxSuspensionForce: 100000,
			rollInfluence:  0.01,
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

		vehicle.addToWorld(world);

		const wheelBodies = [];
		vehicle.wheelInfos.forEach( function(wheel){
			const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
			const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
			const q = new CANNON.Quaternion();
			q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
			wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
			wheelBodies.push(wheelBody);
      game.helper.addVisual(wheelBody, 'wheel');
		});

		// Update wheels
		world.addEventListener('postStep', function(){
			let index = 0;
			game.vehicle.wheelInfos.forEach(function(wheel){
            	game.vehicle.updateWheelTransform(index);
                const t = wheel.worldTransform;
                wheelBodies[index].position.copy(t.position);
                wheelBodies[index].quaternion.copy(t.quaternion);
				index++; 
			});
		});
		
		this.vehicle = vehicle;

		let matrix = [];
		let sizeX = 64,
			sizeY = 64;

		for (let i = 0; i < sizeX; i++) {
			matrix.push([]);
			for (var j = 0; j < sizeY; j++) {
				var height = Math.cos(i / sizeX * Math.PI * 5) * Math.cos(j/sizeY * Math.PI * 5) * 2 + 2;
				if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
					height = 3;
				matrix[i].push(height);
			}
		}

		var hfShape = new CANNON.Heightfield(matrix, {
			elementSize: 100 / sizeX
		});
		var hfBody = new CANNON.Body({ mass: 0 });
		hfBody.addShape(hfShape);
		hfBody.position.set(-sizeX * hfShape.elementSize / 2, -4, sizeY * hfShape.elementSize / 2);
		hfBody.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), -Math.PI/2);
		world.addBody(hfBody);
    this.helper.addVisual(hfBody, 'landscape');
		
		this.animate();
	}
	
	joystickCallback( forward, turn ){
		this.js.forward = forward;
		this.js.turn = -turn;
	}
		
    updateDrive(forward=this.js.forward, turn=this.js.turn){
		
		const maxSteerVal = 0.5;
        const maxForce = 1000;
        const brakeForce = 10;
		 
		const force = maxForce * forward;
		const steer = maxSteerVal * turn;
		 
		if (forward!=0){
			this.vehicle.setBrake(0, 0);
			this.vehicle.setBrake(0, 1);
			this.vehicle.setBrake(0, 2);
			this.vehicle.setBrake(0, 3);

			this.vehicle.applyEngineForce(force, 2);
			this.vehicle.applyEngineForce(force, 3);
	 	}else{
			this.vehicle.setBrake(brakeForce, 0);
			this.vehicle.setBrake(brakeForce, 1);
			this.vehicle.setBrake(brakeForce, 2);
			this.vehicle.setBrake(brakeForce, 3);
		}
		
		this.vehicle.setSteeringValue(steer, 0);
		this.vehicle.setSteeringValue(steer, 1);
	}
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}

	updateCamera(){
		this.camera.position.lerp(this.followCam.getWorldPosition(new THREE.Vector3()), 0.05);
		this.camera.lookAt(this.vehicle.chassisBody.position);
    if (this.helper.sun!=undefined){
			this.helper.sun.position.copy( this.camera.position );
			this.helper.sun.position.y += 10;
		}
	}


  animate() {

    console.log("animate");

    const game = this;

    requestAnimationFrame(function(){game.animate();});

    if (this.nbItems != this.numberItemLoaded)
      return;

    const now = Date.now();
		if (this.lastTime===undefined) this.lastTime = now;
		const dt = (Date.now() - this.lastTime)/1000.0;
		this.FPSFactor = dt;
		this.lastTime = now;
		
		this.world.step(this.fixedTimeStep, dt);
    this.helper.updateBodies(this.world);
		
		this.updateDrive();
		this.updateCamera();

    const delta = this.time.update().getDelta();
    this.entityManager.update(delta);

    this.renderer.render(this.scene, this.camera);

    /*
    this.speed = 0.0;

    if (this.keys.w)
      this.speed = 0.2;
    else if (this.keys.s)
      this.speed = -0.2;

    this.velocity += (this.speed - this.velocity) * .3;

    // supposons que votre body s'appelle "myBody"
    //var impulse = new CANNON.Vec3(0, 0, this.velocity);
    //var point = new CANNON.Vec3(0, 0, 0);
    //this.voitureCannon.applyImpulse(impulse, point);

    if (this.keys.a) {
      this.vehicle.quaternion.setFromAxisAngle(axisY, this.vehicle.quaternion.y + angle);
      //voiture.rotateY(0.04);
    }
    else if (this.keys.d) {
      this.vehicle.quaternion.setFromAxisAngle(axisY, this.vehicle.quaternion.y - angle);
      //voiture.rotateY(-0.04);
    }*/
    /*
    this.a.lerp(this.vehicle.position, 1.9);
    this.b.copy(this.goal.position);

    this.dir.copy(this.a).sub(this.b).normalize();
    const dis = this.a.distanceTo(this.b) - this.coronaSafetyDistance;
    this.goal.position.addScaledVector(this.dir, dis);*/

    //temp.setFromMatrixPosition(goal.matrixWorld);

    //camera.position.lerp(temp, 0.2);
    //this.camera.lookAt(this.voiture.position);

    /*
    // Copy coordinates from Cannon to Three.js
    this.voiture.position.set(
      this.vehicle.position.x,
      this.vehicle.position.y,
      this.vehicle.position.z
    )
    this.voiture.quaternion.set(
      this.vehicle.quaternion.x,
      this.vehicle.quaternion.y,
      this.vehicle.quaternion.z,
      this.vehicle.quaternion.w
    )*/
    /*
    for (let i = 0; i < nbVoiture; i++) {
      voitures[i].position.set(
        voituresCannon[i].position.x,
        voituresCannon[i].position.y,
        voituresCannon[i].position.z
      )
        voitures[i].quaternion.set(
          voituresCannon[i].quaternion.x,
          voituresCannon[i].quaternion.y,
          voituresCannon[i].quaternion.z,
          voituresCannon[i].quaternion.w
        )
    }*/

    //this.world.fixedStep();

    //if (this.stats!=undefined) this.stats.update();
  }
}

class JoyStick{
	constructor(options){
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
		this.origin = { left:this.domElement.offsetLeft, top:this.domElement.offsetTop };
		this.rotationDamping = options.rotationDamping || 0.06;
		this.moveDamping = options.moveDamping || 0.01;
		if (this.domElement!=undefined){
			const joystick = this;
			if ('ontouchstart' in window){
				this.domElement.addEventListener('touchstart', function(evt){ joystick.tap(evt); });
			}else{
				this.domElement.addEventListener('mousedown', function(evt){ joystick.tap(evt); });
			}
		}
	}
	
	getMousePosition(evt){
		let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		return { x:clientX, y:clientY };
	}
	
	tap(evt){
		evt = evt || window.event;
		// get the mouse cursor position at startup:
		this.offset = this.getMousePosition(evt);
		const joystick = this;
		if ('ontouchstart' in window){
			document.ontouchmove = function(evt){ joystick.move(evt); };
			document.ontouchend =  function(evt){ joystick.up(evt); };
		}else{
			document.onmousemove = function(evt){ joystick.move(evt); };
			document.onmouseup = function(evt){ joystick.up(evt); };
		}
	}
	
	move(evt){
		evt = evt || window.event;
		const mouse = this.getMousePosition(evt);
		// calculate the new cursor position:
		let left = mouse.x - this.offset.x;
		let top = mouse.y - this.offset.y;
		//this.offset = mouse;
		
		const sqMag = left*left + top*top;
		if (sqMag>this.maxRadiusSquared){
			//Only use sqrt if essential
			const magnitude = Math.sqrt(sqMag);
			left /= magnitude;
			top /= magnitude;
			left *= this.maxRadius;
			top *= this.maxRadius;
		}
		// set the element's new position:
		this.domElement.style.top = `${top + this.domElement.clientHeight/2}px`;
		this.domElement.style.left = `${left + this.domElement.clientWidth/2}px`;
		
		const forward = -(top - this.origin.top + this.domElement.clientHeight/2)/this.maxRadius;
		const turn = (left - this.origin.left + this.domElement.clientWidth/2)/this.maxRadius;
		
		if (this.onMove!=undefined) this.onMove.call(this.game, forward, turn);
	}
	
	up(evt){
		if ('ontouchstart' in window){
			document.ontouchmove = null;
			document.touchend = null;
		}else{
			document.onmousemove = null;
			document.onmouseup = null;
		}
		this.domElement.style.top = `${this.origin.top}px`;
		this.domElement.style.left = `${this.origin.left}px`;
		
		this.onMove.call(this.game, 0, 0);
	}
}


class CannonHelper{
  constructor(scene){
      this.scene = scene;
  }
  
  addLights(renderer){
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

      // LIGHTS
      const ambient = new THREE.AmbientLight( 0x888888 );
      this.scene.add( ambient );

      const light = new THREE.DirectionalLight( 0xdddddd );
      light.position.set( 3, 10, 4 );
      light.target.position.set( 0, 0, 0 );

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
  
  set shadowTarget(obj){
      if (this.sun!==undefined) this.sun.target = obj;    
  }
  
  createCannonTrimesh(geometry){
  if (!geometry.isBufferGeometry) return null;
  
  const posAttr = geometry.attributes.position;
  const vertices = geometry.attributes.position.array;
  let indices = [];
  for(let i=0; i<posAttr.count; i++){
    indices.push(i);
  }
  
  return new CANNON.Trimesh(vertices, indices);
}

createCannonConvex(geometry){
  if (!geometry.isBufferGeometry) return null;
  
  const posAttr = geometry.attributes.position;
  const floats = geometry.attributes.position.array;
  const vertices = [];
  const faces = [];
  let face = [];
  let index = 0;
  for(let i=0; i<posAttr.count; i+=3){
    vertices.push( new CANNON.Vec3(floats[i], floats[i+1], floats[i+2]) );
    face.push(index++);
    if (face.length==3){
      faces.push(face);
      face = [];
    }
  }
  
  return new CANNON.ConvexPolyhedron(vertices, faces);
}
  
  addVisual(body, name, castShadow=true, receiveShadow=true){
  body.name = name;
  if (this.currentMaterial===undefined) this.currentMaterial = new THREE.MeshLambertMaterial({color:0x888888});
  if (this.settings===undefined){
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
      maxSubSteps:3
    }
    this.particleGeo = new THREE.SphereGeometry( 1, 16, 8 );
    this.particleMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
  }
  // What geometry should be used?
  let mesh;
  if(body instanceof CANNON.Body) mesh = this.shape2Mesh(body, castShadow, receiveShadow);

  if(mesh) {
    // Add body
    body.threemesh = mesh;
          mesh.castShadow = castShadow;
          mesh.receiveShadow = receiveShadow;
    this.scene.add(mesh);
  }
}

shape2Mesh(body, castShadow, receiveShadow){
  const obj = new THREE.Object3D();
  const material = this.currentMaterial;
  const game = this;
  let index = 0;
  
  body.shapes.forEach (function(shape){
    let mesh;
    let geometry;
    let v0, v1, v2;

    switch(shape.type){

    case CANNON.Shape.types.SPHERE:
      const sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8);
      mesh = new THREE.Mesh( sphere_geometry, material );
      break;

    case CANNON.Shape.types.PARTICLE:
      mesh = new THREE.Mesh( game.particleGeo, game.particleMaterial );
      const s = this.settings;
      mesh.scale.set(s.particleSize,s.particleSize,s.particleSize);
      break;

    case CANNON.Shape.types.PLANE:
      geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
      mesh = new THREE.Object3D();
      const submesh = new THREE.Object3D();
      const ground = new THREE.Mesh( geometry, material );
      ground.scale.set(100, 100, 100);
      submesh.add(ground);

      mesh.add(submesh);
      break;

    case CANNON.Shape.types.BOX:
      const box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
                            shape.halfExtents.y*2,
                            shape.halfExtents.z*2 );
      mesh = new THREE.Mesh( box_geometry, material );
      break;

    case CANNON.Shape.types.CONVEXPOLYHEDRON:
      const geo = new THREE.Geometry();

      // Add vertices
      shape.vertices.forEach(function(v){
        geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
      });

      shape.faces.forEach(function(face){
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
      mesh = new THREE.Mesh( geo, material );
      break;

    case CANNON.Shape.types.HEIGHTFIELD:
      geometry = new THREE.Geometry();

      v0 = new CANNON.Vec3();
      v1 = new CANNON.Vec3();
      v2 = new CANNON.Vec3();
      for (let xi = 0; xi < shape.data.length - 1; xi++) {
        for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
          for (let k = 0; k < 2; k++) {
            shape.getConvexTrianglePillar(xi, yi, k===0);
            v0.copy(shape.pillarConvex.vertices[0]);
            v1.copy(shape.pillarConvex.vertices[1]);
            v2.copy(shape.pillarConvex.vertices[2]);
            v0.vadd(shape.pillarOffset, v0);
            v1.vadd(shape.pillarOffset, v1);
            v2.vadd(shape.pillarOffset, v2);
            geometry.vertices.push(
              new THREE.Vector3(v0.x, v0.y, v0.z),
              new THREE.Vector3(v1.x, v1.y, v1.z),
              new THREE.Vector3(v2.x, v2.y, v2.z)
            );
            var i = geometry.vertices.length - 3;
            geometry.faces.push(new THREE.Face3(i, i+1, i+2));
          }
        }
      }
      geometry.computeBoundingSphere();
      geometry.computeFaceNormals();
      mesh = new THREE.Mesh(geometry, material);
      break;

    case CANNON.Shape.types.TRIMESH:
      geometry = new THREE.Geometry();

      v0 = new CANNON.Vec3();
      v1 = new CANNON.Vec3();
      v2 = new CANNON.Vec3();
      for (let i = 0; i < shape.indices.length / 3; i++) {
        shape.getTriangleVertices(i, v0, v1, v2);
        geometry.vertices.push(
          new THREE.Vector3(v0.x, v0.y, v0.z),
          new THREE.Vector3(v1.x, v1.y, v1.z),
          new THREE.Vector3(v2.x, v2.y, v2.z)
        );
        var j = geometry.vertices.length - 3;
        geometry.faces.push(new THREE.Face3(j, j+1, j+2));
      }
      geometry.computeBoundingSphere();
      geometry.computeFaceNormals();
      mesh = new THREE.Mesh(geometry, MutationRecordaterial);
      break;

    default:
      throw "Visual type not recognized: "+shape.type;
    }

    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = castShadow;
          
          mesh.traverse( function(child){
              if (child.isMesh){
                  child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
              }
          });

    var o = body.shapeOffsets[index];
    var q = body.shapeOrientations[index++];
    mesh.position.set(o.x, o.y, o.z);
    mesh.quaternion.set(q.x, q.y, q.z, q.w);

    obj.add(mesh);
  });

  return obj;
}
  
  updateBodies(world){
      world.bodies.forEach( function(body){
          if ( body.threemesh != undefined){
              body.threemesh.position.copy(body.position);
              body.threemesh.quaternion.copy(body.quaternion);
          }
      });
  }
}

new Main();
