import math
import random
import time
import json
#import requests

#scores = {"numUsers":3,"numPosts":0}
#ratios = {"numUsers": 3,"u0":{"u1":{"numShares": 0,"weight": 0},"u2":{"numShares": 0,"weight": 0}},"u1":{"u0":{"numShares":0,
#"weight": 0},"u2":{"numShares":0,
#"weight": 0}},"u2":{"u0":{"numShares": 0,"weight": 0},"u1":{"numShares": 0,"weight": 0}}}
#predictions = {}

SCORES_FILE_PATH = "scores.json"
PREDICTIONS_FILE_PATH = "predictions.json"
RATIOS_FILE_PATH = "ratios.json"

scores_file = open(SCORES_FILE_PATH).read()
scores = json.loads(scores_file)

predictions_file = open(PREDICTIONS_FILE_PATH).read()
predictions = json.loads(predictions_file)

ratios_file = open(RATIOS_FILE_PATH).read()
ratios = json.loads(ratios_file)

def calculate_diff(score1,score2):
	if (score1>=0 and score2>=0) or (score1<=0 and score2<=0):
		return 1 - abs(score1-score2)
	else:
		return -1*abs((score1-score2)/2)

def update_ratio(USER,POST):
	#updates ratio (between 2 users) based on post
	#scores = requests.get('https://alterkation.org')
	#ratio = requests.get('https://alterkation.org')
	for key in ratios:
		#Need to rewrite to not rely on index i
		if key != "numUsers":
			if key in scores[POST] and key != USER:
				temp = calculate_diff(scores[POST][USER], scores[POST][key])
				numShares = ratios[USER][key]["numShares"]
				weight = ratios[USER][key]["weight"] #probably can't have variable called weight
				weight = ((weight*numShares)+temp)/(numShares+1)
				ratios[USER][key]["numShares"] += 1
				ratios[key][USER]["numShares"] += 1
				ratios[USER][key]["weight"] = weight
				ratios[key][USER]["weight"] = weight;
			#requests.post('https://alterkation.org',data = {USER:ratio[USER]})
			#requests.post('https://alterkation.org',data = {USER:ratio[USER]})

def update_prediction():
	#updates prediction to match changes
	#scores = requests.get('https://alterkation.org')
	#ratios = requests.get('https://alterkation.org')
	#predictions = requests.get('https://alterkation.org')

	posts = []
	for key in scores:
		if key != "numUsers" and key != "numPosts":
			posts.append(key)
	users = []
	for key in ratios:
		if key != "numUsers":
			users.append(key)
	for p in range(0,scores["numPosts"]):
		for i in range(0,scores["numUsers"]):
			if not (users[i] in scores[posts[p]]):
				prediction = 0.0
				n,j = 0,0
				while n<scores[posts[p]]["numPosters"] and j<ratios["numUsers"]:
					if users[j] in scores[posts[p]] and j != i:
						n+=1
					if users[i] in ratios and users[j] in ratios[users[i]]:
						prediction += ratios[users[i]][users[j]]["weight"]
					j += 1
				prediction = prediction / scores[posts[p]]["numPosters"]
				if not (posts[p] in predictions):
					predictions[posts[p]] = {}
					for key in ratios:
						if key != "numUsers":
							predictions[posts[p]][key] = 0.0
				predictions[posts[p]][users[i]] = prediction
			elif (posts[p] in predictions) and (users[i] in predictions[posts[p]]):
				del predictions[posts[p]][users[i]]

def add_comment(USER,POST,score):
	#adds a comment
	#nested dictionaries
	#scores = requests.get('https://alterkation.org')
	if USER in scores[POST]:
		scores[POST][USER] = (scores[POST][USER] + score)/2
	else:
		scores[POST][USER] = score
		scores[POST]["numPosters"] += 1 #do we even need numPosters?
	#send data
	#requests.post('https://alterkation.org', data = {POST:{USER:score}})
	#update the ratio
	update_ratio(USER,POST)
	update_prediction()

	write_data()
	read_data()

def add_new_post(USER,POST):
	#posts new posts
	#scores = requests.get('https:/alterkation.org') #needs to be redirected to proper place
	scores[POST] = {"numPosters":1}
	scores[POST][USER] = 1
	scores["numPosts"] += 1
	#requests.post('https://alterkation.org/post',data = {POST:{USER:score}})
	#update the prediction
	update_prediction()

	write_data()
	read_data()

def add_user(USER):
	ratios[USER] = {}
	for key in ratios:
		if key != "numUsers":
			ratios[key][USER] = {}
			ratios[key][USER]["numShares"] = 0
			ratios[key][USER]["weight"] = 0
			ratios[USER][key] = {}
			ratios[USER][key]["numShares"] = 0
			ratios[USER][key]["weight"] = 0
	ratios["numUsers"] += 1
	scores["numUsers"] += 1

	write_data()
	read_data()

#def children(POST):
	#don't actually need this, can ask database directly for children
	#returns list of the children of f
#	children = []
#	for POSTi in database():
#		if POSTi.parent == POST:
#			children.add(POSTi)
#	return children

#def num_Citations(POST):
	#counts number of citations, denoted by [citation]en.wikipedia.org/wiki/The_Berrys[\citation]
#	n = 0
#	for token in POST.content().split(): #get contents of post from database
#		if token == "[\citation]": #count number of comments by number of comment closes
#			n+=1
#	return n

#def size(POST):
	#Here sum is the total number of comments
#	sum = 2 #add 1 to ensure log(sum)!=0
	#for CHILD in children(POST):
#	for CHILD in requests.get('https://alterkation.org'): #assuming this is domain name, but wrong fnc.
#		if Children(POST) != 0:
#			size += size(CHILD) + num_Citations(CHILD)
#		else:
#			size += num_Citations(CHILD)
#		return math.log(sum,2)

def sentiment(USER,POST):
	#This is how much the user agrees/disagrees with the poster
	#Looks for value in position in table corresponding to user and post
	#position based on negative of sentiment
	#predictions = requests.get('https://alterkation.org')
	if USER in scores[POST]:
		return scores[POST][USER]
	else:
		try:
			return predictions[POST][USER]
		except:
			return 0

def read_data():
	scores_file = open(SCORES_FILE_PATH).read()
	scores = json.loads(scores_file)

	predictions_file = open(PREDICTIONS_FILE_PATH).read()
	predictions = json.loads(predictions_file)

	ratios_file = open(RATIOS_FILE_PATH).read()
	ratios = json.loads(ratios_file)

def write_data():
	with open(SCORES_FILE_PATH, "w") as fsc:
		json.dump(scores, fsc)
	with open(PREDICTIONS_FILE_PATH, "w") as fpd:
		json.dump(predictions, fpd)
	with open(RATIOS_FILE_PATH, "w") as frt:
		json.dump(ratios, frt)

#def weight(USER,POST):
	#Determines order that posts are presented to user
	#Note: probably works best if only show posts over the last 2 weeks (say)

#	start_date = POST.time #from database
#	age = (time.time() - startDate)/3600 #age of post in hours

#	a = 0.3 # Controls importance of relevance factor of post
#	b = 0.5 #Controls importance of time variable (0.5 implies W(t=0)=3*W(t=infinity))
#	c = 1.02 #Changes speed at which time component decays (with c = 1.02, time is fairly close to 0 after about a week)
#	d = 1.0 #Controls impact of random element
#	return  size(POST) * ( a - sentiment(POST,USER) ) * ( d + random.random() )
	#Note that negative sentiment increases weigth, and negative weight is possible

#add_new_post("u0","p0")
#add_new_post("u1","p1")
#add_new_post("u2","p2")
#add_comment("u2","p0",-.75)
#add_comment("u1","p0",0)
#add_comment("u0","p1",0)
#add_comment("u2","p1",.5)
#add_comment("u0","p2",-.6)
#print (weight("u1","p2"))

#print (scores)
#print (ratios)
#print (predictions)