package models

import dataAccess.sqlTraits.SQLSavable
import service.TimeTools

/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/28/13
 * Time: 5:35 PM
 * To change this template use File | Settings | File Templates.
 */
case class Feedback(userId: Long, category: String, description: String, submitted: String = TimeTools.now()) extends SQLSavable {
  def save = insert("feedback", 'userId -> userId, 'category -> category, 'description -> description, 'submitted -> submitted)
}
