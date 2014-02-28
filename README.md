Explr
=====

Explr the world through music

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
