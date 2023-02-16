import * as THREE from 'three'
import * as YUKA from 'yuka';
import * as CANNON from 'cannon-es'

// NOTE: three/addons alias or importmap does not seem to be supported by Parcel, use three/examples/jsm/ instead 

import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js';

import {
  GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Vector3 } from 'three';

// Example of hard link to official repo for data, if needed
// const MODEL_PATH = 'https://raw.githubusercontent.com/mrdoob/three.js/r148/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';


// INSERT CODE HERE
var camera, scene, renderer, goal, keys, route, voiture, voitureCannon, circuit;
var entityManager = new YUKA.EntityManager();
let numberItemLoaded = 0;
let voitures = [];
let voituresCannon = [];

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
})

var dir = new THREE.Vector3;
var a = new THREE.Vector3;
var b = new THREE.Vector3;
var coronaSafetyDistance = 10;
var velocity = 0.0;
var speed = 0.0;

const time = new YUKA.Time();
const positions1 = [];
const positions2 = [];
const positions3 = [];
const positions4 = [];

let nbVoiture = 4;
let nbItems = nbVoiture + 1;

let axisX = new CANNON.Vec3(1, 0, 0);
let axisY = new CANNON.Vec3(0, 1, 0);
let axisZ = new CANNON.Vec3(0, 0, 1);

let angle = 0.04;




init();
animate();

function init() {

  const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))

  const voituresPositions = [
    new Vector3(5, 0, 0),
    new Vector3(10, 0, 0),
    new Vector3(-5, 0, 0),
    new Vector3(-10, 0, 0)
  ];

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 4.0, 0);

  scene = new THREE.Scene();
  camera.lookAt(scene.position);

  goal = new THREE.Object3D;
  //follow = new THREE.Object3D;
  goal.position.z = -coronaSafetyDistance;
  goal.add(camera);

  var gridHelper = new THREE.GridHelper(100, 100);
  scene.add(gridHelper);

  const planeShape = new CANNON.Plane();
  const planeBody = new CANNON.Body({ mass: 0 });
  planeBody.addShape(planeShape);
  planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(planeBody);

  scene.add(new THREE.AxesHelper());

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional

  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
  directionalLight.position.set(0, 10, 10);
  scene.add(directionalLight);

  var routeGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
  var routeMaterial = new THREE.MeshNormalMaterial();

  route = new THREE.Mesh(routeGeometry, routeMaterial);

  scene.add(route);

  function sync(entity, renderComponent) {
    //console.log("____test____");
    renderComponent.matrix.copy(entity.worldMatrix);
  }

  let paths = [];

  const path1 = new YUKA.Path();
  path1.add(new YUKA.Vector3(50, 0, 0));
  path1.add(new YUKA.Vector3(0, 0, 0));
  path1.add(new YUKA.Vector3(0, 0, 50));

  const path2 = new YUKA.Path();
  path2.add(new YUKA.Vector3(-50, 0, -25));
  path2.add(new YUKA.Vector3(20, 0, 10));
  path2.add(new YUKA.Vector3(40, 0, 40));

  const path3 = new YUKA.Path();
  path3.add(new YUKA.Vector3(40, 0, -40));
  path3.add(new YUKA.Vector3(-20, 0, -10));
  path3.add(new YUKA.Vector3(5, 0, 40));

  const path4 = new YUKA.Path();
  path4.add(new YUKA.Vector3(25, 0, 25));
  path4.add(new YUKA.Vector3(-25, 0, 25));
  path4.add(new YUKA.Vector3(-25, 0, -25));
  path4.add(new YUKA.Vector3(25, 0, -25));


  path1.loop = true;
  path2.loop = true;
  path3.loop = true;
  path4.loop = true;

  paths.push(path1);
  paths.push(path2);
  paths.push(path3);
  paths.push(path4);


  for (let i = 0; i < path1._waypoints.length; i++) {
    const point = path1._waypoints[i];
    positions1.push(point.x, point.y, point.z);
  }
  for (let i = 0; i < path2._waypoints.length; i++) {
    const point = path2._waypoints[i];
    positions2.push(point.x, point.y, point.z);
  }
  for (let i = 0; i < path3._waypoints.length; i++) {
    const point = path3._waypoints[i];
    positions3.push(point.x, point.y, point.z);
  }
  for (let i = 0; i < path4._waypoints.length; i++) {
    const point = path4._waypoints[i];
    positions4.push(point.x, point.y, point.z);
  }

  const positions = [positions1, positions2, positions2, positions4]

  const lineGeometry1 = new THREE.BufferGeometry();
  const lineGeometry2 = new THREE.BufferGeometry();
  const lineGeometry3 = new THREE.BufferGeometry();
  const lineGeometry4 = new THREE.BufferGeometry();

  const lineGeometrys = [lineGeometry1, lineGeometry2, lineGeometry3, lineGeometry4]

  for (let i = 0; i < nbVoiture; i++) {
    lineGeometrys[i].setAttribute('position', new THREE.Float32BufferAttribute(positions[i], 3));
  }

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });

  const lines1 = new THREE.LineLoop(lineGeometry1, lineMaterial);
  const lines2 = new THREE.LineLoop(lineGeometry2, lineMaterial);
  const lines3 = new THREE.LineLoop(lineGeometry3, lineMaterial);
  const lines4 = new THREE.LineLoop(lineGeometry4, lineMaterial);

  scene.add(lines1);
  scene.add(lines2);
  scene.add(lines3);
  scene.add(lines4);


  const loader = new GLTFLoader().setPath('assets/models/');

  function modelLoader(fileName) {
    return new Promise((resolve, reject) => {
      loader.load(fileName, data => resolve(data), null, reject);
    });
  }

  async function loadData(fileName, coord, scale, index) {
    const gltf = await modelLoader(fileName);
    //console.log(gltf.scene);
    let objet = gltf.scene.children[index];
    //objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    scene.add(objet);

    return objet;
  }

  async function loadFullData(fileName, coord, scale) {
    const gltf = await modelLoader(fileName);

    let objet = gltf.scene;
    //objet.matrixAutoUpdate = true;
    objet.position.set(coord.x, coord.y, coord.z);
    objet.scale.set(scale.x, scale.y, scale.z);

    scene.add(objet);

    return objet;
  }

  loadData('roads.glb', new Vector3(0, 0, 0), new Vector3(4, 4, 4), 0)
    .catch(error => {
      console.error(error);
    })
    .then((objet) => {
      circuit = objet;
      numberItemLoaded += 1;
    });

  loadFullData('voiture.glb', new Vector3(0, 0, 0), new Vector3(1, 1, 1))
    .catch(error => {
      console.error(error);
    })
    .then((objet) => {
      voiture = objet;
      voitureCannon = new CANNON.Body({ mass: 1 });
      voitureCannon.addShape(cubeShape);
      voitureCannon.position.x = voiture.position.x;
      voitureCannon.position.y = voiture.position.y;
      voitureCannon.position.z = voiture.position.z;
      world.addBody(voitureCannon);

      numberItemLoaded += 1;
    });

  for (let i = 0; i < nbVoiture; i++) {
    loadFullData('voiture.glb', voituresPositions[i], new Vector3(1, 1, 1))
      .catch(error => {
        console.error(error);
      })
      .then((objet) => {
        var vehicle = new YUKA.Vehicle();
        vehicle.position.copy(paths[i].current());
        vehicle.maxSpeed = 7;

        const followPathBehavior = new YUKA.FollowPathBehavior(paths[i], 10);
        vehicle.steering.add(followPathBehavior);

        const onPathBehavior = new YUKA.OnPathBehavior(paths[i]);
        //onPathBehavior.radius = 2;
        vehicle.steering.add(onPathBehavior);

        entityManager.add(vehicle);

        objet.matrixAutoUpdate = false;
        vehicle.setRenderComponent(objet, sync);

        let cubeBody = new CANNON.Body({ mass: 1 })
        cubeBody.addShape(cubeShape)
        cubeBody.position.x = vehicle.position.x
        cubeBody.position.y = vehicle.position.y
        cubeBody.position.z = vehicle.position.z
        world.addBody(cubeBody)

        numberItemLoaded += 1;
        voitures.push(vehicle);
        voituresCannon.push(cubeBody);
      })
  }

  keys = {
    a: false,
    s: false,
    d: false,
    w: false
  };
  document.body.addEventListener('keydown', function (e) {

    var key = e.code.replace('Key', '').toLowerCase();
    if (keys[key] !== undefined)
      keys[key] = true;

  });
  document.body.addEventListener('keyup', function (e) {

    var key = e.code.replace('Key', '').toLowerCase();
    if (keys[key] !== undefined)
      keys[key] = false;

  });
}


function animate() {

  requestAnimationFrame(animate);

  if (numberItemLoaded < 5) {
    return;
  }

  const delta = time.update().getDelta();
  entityManager.update(delta);
  //console.log(delta);

  world.step(delta)


  speed = 0.0;

  if (keys.w)
    speed = 0.2;
  else if (keys.s)
    speed = -0.2;

  velocity += (speed - velocity) * 0.3;
  /*
    // supposons que votre body s'appelle "myBody"
    var impulse = new CANNON.Vec3(0, 0, velocity);
    var point = new CANNON.Vec3(0, 0, 0);
    voitureCannon.applyImpulse(impulse, point);
  */

  voiture.translateZ(velocity);

  //voitureCannon.z += 1;

  //voitureCannon.position.y += 0.5;
  //console.log(voitureCannon.position.z);

  //console.log(voitureCannon.quaternion.y);

  if (keys.a) {
    //voitureCannon.quaternion.setFromAxisAngle(axisY, voitureCannon.quaternion.y + angle);
    voiture.rotateY(0.04);
  }
  else if (keys.d) {
    //voitureCannon.quaternion.setFromAxisAngle(axisY, voitureCannon.quaternion.y - angle);
    voiture.rotateY(-0.04);
  }

  //detectCollision(voiture);

  a.lerp(voiture.position, 1.9);
  b.copy(goal.position);

  dir.copy(a).sub(b).normalize();
  const dis = a.distanceTo(b) - coronaSafetyDistance;
  goal.position.addScaledVector(dir, dis);
  //temp.setFromMatrixPosition(goal.matrixWorld);

  //camera.position.lerp(temp, 0.2);
  camera.lookAt(voiture.position);
  /*
    // Copy coordinates from Cannon to Three.js
    voiture.position.set(
      voitureCannon.position.x,
      voitureCannon.position.y,
      voitureCannon.position.z
    )
    voiture.quaternion.set(
      voitureCannon.quaternion.x,
      voitureCannon.quaternion.y,
      voitureCannon.quaternion.z,
      voitureCannon.quaternion.w
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

  world.fixedStep();

  renderer.render(scene, camera);
}