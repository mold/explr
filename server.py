from flask import Flask, request, redirect, url_for, render_template
from hashlib import md5
import urllib2
import ast

app = Flask(__name__)

api = {
	"lastfm":{
		"key":"865b1653dbe200905a5b75d9d839467a",
		"url":"http://ws.audioscrobbler.com/2.0/",
		"auth_url":"http://www.last.fm/api/auth/?api_key=",
		"secret":"9f5620d0f0ac4599920cfd4f8313f5e6"
	}
}

sessions={}

@app.route("/")
def root():
	return redirect(url_for("welcome"))

"""The first page, greeting new explrrs"""
@app.route("/explr/")
def welcome():
	# Ask user to auth
	# TODO: Show a nicer page/template
	return render_template("index.html",api=api, auth=False)

@app.route("/auth/")
def auth():
	token = request.args.get("token")
	secret = "api_key"+api["lastfm"]["key"]+"methodauth.getSessiontoken"+token+api["lastfm"]["secret"]
	sig = md5(secret).hexdigest();
	url = api["lastfm"]["url"]+"?api_key="+api["lastfm"]["key"]+"&method=auth.getSession&token="+token+"&api_sig="+sig+"&format=json"
	session_response = ast.literal_eval(urllib2.urlopen(url).read())
	s_key = session_response["session"]["key"]
	s_name = session_response["session"]["name"]
	sessions[s_name] = s_key
	# print session_response
	# print url
	# print sessions
	return redirect(url_for("explr", user=s_name))
	# return "Auth'd! Your are "+s_name+" and your session key is "+s_key

@app.route("/explr/<user>")
def explr(user):
	try:
		sk = sessions[user]
		s = {"name":user,"key":sk}
		return render_template("index.html", auth=True,s=s)
	except:
		return "You are not authenticated, go away"

if __name__ == "__main__":
	app.debug=True	
	app.run()
