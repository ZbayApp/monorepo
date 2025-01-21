@objc(DataDirectory)
class DataDirectory: NSObject {
  
  @objc
  func create() -> NSString {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    let documentsDirectory = paths[0]
    let docURL = URL(string: documentsDirectory)!
    let dataPath = docURL.appendingPathComponent("backend/files3")
    if !FileManager.default.fileExists(atPath: dataPath.path) {
      do {
        try FileManager.default.createDirectory(atPath: dataPath.path, withIntermediateDirectories: true, attributes: nil)
      } catch {
        print(error.localizedDescription)
      }
    }
    return dataPath.path as NSString
  }
}
