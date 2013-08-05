# Ayamel

This is the Ayamel site developed by the ARCLITE Lab at Brigham Young University as part of the National Flagship Media Library effort.

**Table of Contents**
 - <a href="#setup">Setup</a>
    - <a href="#acquire-code">Acquire code</a>
    - <a href="#configure-mysql">Configure MySQL</a>
    - <a href="#configure-resource-library-api">Configure Resource Library API</a>
    - <a href="#configure-file-upload-source">Configure file upload source</a>
 - <a href="#running">Running</a>
    - <a href="#development-server">Development Server</a>
    - <a href="#production-server">Production Server</a>
 - <a href="#understanding-the-code">Understanding the code</a>
 - <a href="#api">API</a>

## Setup

### Acquire code

Clone the repository. This uses other external git repositories, so to acquire them, run the install script:

    ./install.sh
    
### Configure MySQL

Create a database named `ayamel` on your MySQL server. In `conf/application.conf` you'll need to set the following parameters to match your configuration:

    db.default.driver=com.mysql.jdbc.Driver
    db.default.url="jdbc:mysql://localhost/ayamel?characterEncoding=UTF-8"
    db.default.user=root
    db.default.password=root
    
### Configure Resource Library API

You need to specify the base URL and credentials to the Ayamel Resource Library API.

    resourceLibrary.baseUrl="http://api.ayamel.org/api/v1/"
    resourceLibrary.clientId=""
    resourceLibrary.apiKey=""
    
### Configure file upload source

Ayamel has the potential to support different methods of uploading files. You can specify which method you want to use. Currently the only support method is Amazon S3. To state which upload engine you want to use, specify:

    uploadEngine="s3"
    
Depending on the upload engine you are using, you may need to specify settings needed for that engine. For Amazon S3, you need to specify the following ones:

    amazon.accessKeyId="accessKeyId"
    amazon.secretAccessKey="secretAccessKey"
    amazon.bucket="bucketName"

Also, note that if you use S3 then you must set up your bucket with CORS support.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>Authorization</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

### Configure media settings

You can set default media settings, which include the maximum dimensions for an image and video thumbnail time. Right now, the video thumbnail time setting actually doesn't do anything.

    media.image.maxWidth=1500
    media.image.maxHeight=1500
    media.video.thumbnailTime=10

### Configure ffmpeg

The computer that is running Ayamel must also have ffmpeg installed and available. You must define the location of the
software:

    media.video.ffmpeg="/usr/bin/ffmpeg"

or

    media.video.ffmpeg="c:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"

### Configure PlayGraph

This uses PlayGraph. So you need to have both an authoring key and a playback key. Go to http://playgraph.byu.edu/ to create an account and keys. Then set the following configuration entries:

    playgraph.host="http://playgraph.byu.edu/"
    playgraph.author.key="author key goes here"
    playgraph.author.secret="author secret goes here"
    playgraph.player.key="player key goes here"
    playgraph.player.secret="player secret goes here"

### Configure translation keys

Ayamel supports text translations using WordReference and Google Translate. To use these services you must specify the
right authentication credentials in the configuration file.

For WordReference, enter the API key:

    translation.wordReference.key="word reference key goes here"

For Google Translate, this uses the research version (which will cease by the end of the year, so modifications will be
needed). So you need to specify the email account that has access the the API, the password of that account, and a
unique name that describes the app. For the BYU instance of Ayamel, this name is `arclite-ayamel-1`.

    translation.google.email="someemail@gmail.com"
    translation.google.password="your password here"
    translation.google.source="arclite-ayamel-1"

### Configure SMTP

You will need to configure an email account with SMTP settings in order to send emails. The settings will vary based on your provider. For a Google account, it would be:

    smtp.host="smtp.gmail.com"
    smtp.port=465
    smtp.name="Ayamel Admin"
    smtp.address="my_email@gmail.com"
    smtp.password="my_password"

### Configure Google Scripts

You will need to create and authorize Google Scripts for [question sets](https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Question%20Sets). The scripts are located under the `scripts` folder.

For each script:
 * Create a script at https://script.google.com/
 * Copy the content of the file to the newly created Google Script.
 * Click Run once then click Authorize.
 * Then publish it. Click "Publish" > "Deploy as web app..."
 * Enter anything in the version box and click "Save New Version"
 * Under "Execute the app as:" make sure "me" is selected.
 * Under "Who has access to the app:" select "Anyone, even anonymous"
 * Click "Deploy"
 * Copy the URL and enter it in the configuration file.

    exercises.createFormScript="https://script.google.com/macros/s/1234567890abcdefghijklmnopqrstuvwxyz/exec"
    exercises.getResponseIndexScript="https://script.google.com/macros/s/1234567890abcdefghijklmnopqrstuvwxyz/exec"
    exercises.gradeFormScript="https://script.google.com/macros/s/1234567890abcdefghijklmnopqrstuvwxyz/exec"

### Configure Quizlet

Quizlet is used when exporting word lists. You will need to go to https://quizlet.com/api/2.0/docs/ and sign up for a developer key.
Once that is done you can enter the information in the configuration file. This information will include the client ID, the secret key, and an auth value.
The auth value is your client ID and key separated by a colon and base64-encoded. You can go to https://quizlet.com/api/2.0/docs/authorization_code_flow and under **Step 2** it will say what yours is.

    quizlet.clientId=""
    quizlet.secretKey=""
    quizlet.auth=""

## Running

### Development server
From the project root directory, run it as a Play! application.

    play run
    
Once it is running, go to `http://localhost:9000` in your browser. You should see a page asking you if you want to apply the database evolutions. Click the button to do so. It should be working now.

### Production server
From the project root directory, start the app with Play, specifying the port that you want and applying the database evolutions:

    play "start -DapplyEvolutions.default=true 9000"
    
This would run the server on port 9000.

## Understanding the Code

The [wiki](https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki) provides descriptions of the different parts of the code and how they work.

## API

The most up-to-date version of the ScalaDoc is <a href="http://sartre3.byu.edu/ayamel/api">here</a>.
