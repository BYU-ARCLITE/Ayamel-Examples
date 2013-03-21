// Copyright 2011 Twitter, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
// file except in compliance with the License. You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.

package service.oauth.com.twitter.joauth

trait Request {
  def authHeader: Option[String]
  def body: String
  def contentType: Option[String]
  def host: String
  def method: String
  def path: String
  def port: Int
  def queryString: String
  def scheme: String

  def parsedRequest(params: List[(String, String)]) =
    new ParsedRequest(
      if (scheme ne null) scheme.toUpperCase else null,
      host,
      port,
      if (method ne null) method.toUpperCase else null,
      path,
      params)
}

case class ParsedRequest(
  scheme: String,
  host: String,
  port: Int,
  verb: String,
  path: String,
  params: List[(String, String)]);