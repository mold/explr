Explr
=====

Explr the world through music

Todo
-----
- [ ] Add flattr button
- [ ] Improve screenshotting
  - [ ] Show a warning when screenshotting before all artists have been loaded
  - [ ] Add progress bar to screenshot?
  - [ ] Separate screenshot page with imgur upload
- [ ] Show more artists from each country
- [ ] Add favicon
- [ ] Show artists without a country
- [ ] Improve api code
- [ ] Restructure everything

Running the server
-----

For """MAAAACC"":
- Install pip and virtualenv:
```
  sudo easy_install pip
  sudo pip install virtualenv
```
- Go to a directory of your choice (the git project folder or some other folder _without spaces in the path_)
- Run ```virtualenv venv``` to create a virtual environment called "venv"
- Run ```. venv/bin/activate``` to activate the virtual environment
- Install flask: ```pip install flask```
- Run ```python server.py```, go to ```http://localhost:5000/``` 


For ubuntu etc:
- Install pip and Flask:
```
  sudo apt-get install python-pip
  sudo pip install Flask
```
- Start the server by running ```python server.py```
- Go to ```http://localhost:5000/``` 

Running without flask
-----

- Go to the project folder in the terminal, run ```python -m SimpleHTTPServer 5000```
- Go to ```http://localhost:5000/index_noflask.html``` 
