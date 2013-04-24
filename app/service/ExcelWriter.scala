package service

import models.Activity
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.apache.poi.ss.usermodel.{Workbook, Sheet}
import java.io.{ByteArrayInputStream, ByteArrayOutputStream, File, FileOutputStream}
import scala.concurrent.Future

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/24/13
 * Time: 12:22 PM
 * To change this template use File | Settings | File Templates.
 */
object ExcelWriter {

  private def writeActivityHeader(sheet: Sheet) {
    val headerRow = sheet.createRow(0)
    headerRow.createCell(0).setCellValue("id")
    headerRow.createCell(1).setCellValue("actor id")
    headerRow.createCell(2).setCellValue("verb")
    headerRow.createCell(3).setCellValue("page category")
    headerRow.createCell(4).setCellValue("page action")
    headerRow.createCell(5).setCellValue("page id")
    headerRow.createCell(6).setCellValue("generator type")
    headerRow.createCell(7).setCellValue("generator id")
    headerRow.createCell(8).setCellValue("generator item ref")
    headerRow.createCell(9).setCellValue("object type")
    headerRow.createCell(10).setCellValue("object id")
    headerRow.createCell(11).setCellValue("object item ref")
    headerRow.createCell(12).setCellValue("published date")
  }

  private def uploadWorkbook(workbook: Workbook): Future[String] = {
    // First write the workbook to an output stream to get the bytes
    val out = new ByteArrayOutputStream()
    workbook.write(out)
    out.close()
    val bytes = out.toByteArray

    // Now turn the bytes into an input stream an upload it
    val in = new ByteArrayInputStream(bytes)
    val filename = FileUploader.uniqueFilename("workbook.xlsx")
    val mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    FileUploader.uploadStream(in, filename, bytes.size, mime)
  }

  def writeActivity(activityStream: List[Activity]): Future[String] = {

    // Create a workbook
    val workbook = new XSSFWorkbook()
    val sheet = workbook.createSheet("Event data")

    writeActivityHeader(sheet)

    var rowIndex = 1
    for (activity <- activityStream) {
      val row = sheet.createRow(rowIndex)

      row.createCell(0).setCellValue(activity.id.get)
      row.createCell(1).setCellValue(activity.actor)
      row.createCell(2).setCellValue(activity.verb)
      row.createCell(3).setCellValue(activity.activityContext.pageContext.category)
      row.createCell(4).setCellValue(activity.activityContext.pageContext.action)
      row.createCell(5).setCellValue(activity.activityContext.pageContext.id)
      row.createCell(6).setCellValue(activity.activityContext.generatorContext.objectType)
      row.createCell(7).setCellValue(activity.activityContext.generatorContext.id)
      row.createCell(8).setCellValue(activity.activityContext.generatorContext.itemRef)
      row.createCell(9).setCellValue(activity.activityObject.objectType)
      row.createCell(10).setCellValue(activity.activityObject.id)
      row.createCell(11).setCellValue(activity.activityObject.itemRef)
      row.createCell(12).setCellValue(activity.published)

      rowIndex += 1
    }

    uploadWorkbook(workbook)
//    workbook.write(new FileOutputStream(new File("c:\\tmp\\test.xlsx")))
  }
}
