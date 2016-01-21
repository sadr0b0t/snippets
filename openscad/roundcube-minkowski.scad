roundcube_sphere();
//roundcube_cylinder();

module roundcube_sphere() {
  minkowski($fn=20) {
    cube(20);
    sphere(5);
  }
}

module roundcube_cylinder() {
  minkowski($fn=20) {
    cube(20);
    cylinder(r=5);
  }
}
