pen.clear();
pen.setColor("#4C97FF");
pen.setSize(3);
pen.down();
for (let i = 0; i < 36; i++) {
  move(10);
  turnRight(10);
}
pen.up();
