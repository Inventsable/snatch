function importVideo(temp) {
  var vid = new File(temp);
  app.project.importFiles([vid.fsName]);
  return temp;
}
