function importVideo(temp) {
  var vid = new File(temp);
  app.project.importFile(new ImportOptions(vid));
  return temp;
}
