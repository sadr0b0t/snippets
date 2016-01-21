roundcube(size_x=10, size_y=20, size_z=30, r=15);

module roundcube(size_x, size_y, size_z, r)
hull() {
  translate([0, 0, 0]) sphere(r);
  translate([size_x, 0, 0]) sphere(r);
  translate([size_x, size_y, 0]) sphere(r);
  translate([0, size_y, 0]) sphere(r);
  translate([0, 0, size_z]) sphere(r);
  translate([size_x, 0, size_z]) sphere(r);
  translate([size_x, size_y, size_z]) sphere(r);
  translate([0, size_y, size_z]) sphere(r);
}
