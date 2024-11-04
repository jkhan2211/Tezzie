## Tezzie

#### Description:
Intro:

Welcome to my journey of recreating one of the most iconic arcade games of all time—Outrun. Released in 1986 by Sega, Outrun revolutionized the racing game genre with its groundbreaking graphics, innovative gameplay, and unforgettable soundtrack. Set against a backdrop of stunning landscapes, players could race through picturesque vistas filled with palm trees, mountains, and coastal roads, all while choosing their own paths in a branching race system that added a unique twist to the genre.

As a child, I wasn’t much for the arcade scene, preferring the comfort of my home with the fantastic titles on my Commodore 64. Yet, Outrun always had a magnetic pull, its exhilarating speed and vibrant visuals capturing my imagination. It wasn't just the thrill of racing that I loved; it was the feeling of freedom it offered. Now, as I embark on the challenge of recreating this classic, I’m excited to explore how I can bring those nostalgic memories back to life while paying homage to a game that has inspired generations of gamers. Join me as I dive into the development process, share insights about its history, and ultimately aim to capture the essence of what made Outrun a timeless masterpiece.

(remove)
A note on code structure
This project happens to be implemented in javascript (because its easy for prototyping) but is not intended to demonstrate javascript techniques or best practices. In fact, in order to keep it simple to understand it embeds the javascript for each example directly in the HTML page (horror!) and, even worse, uses global variables and functions (OMG!).

If I was building a real game I would have much more structure and organization to the code, but since its just a racing game tech demo, I have elected to KISS. (remove)

(Amazon Bedrock to generate images)
### Version 1
Great! We’re going to build a variation on his ‘Realistic Hills Using 3d-Projected Segments’ approach. We will do it gradually, over the course of the next 4 articles, but we will start off here with v1, building very simple straight road geometry and projecting it onto our HTML5 canvas element.

### 3d World on a 2d screen

Similar Triangle
Diagram:
in (plan/sideview.pdf)
Equation explain
```
h = camera height
d = distance from camera to screen
z = distance from camera to car
y = screen y coordinate
```

Then we could use the law of similar triangles to calculate
```
y = h*d/z
```

We could have also drawn a similar diagram from a top-down view instead of a side-on view and derived a similar equation for calculating the screen x coordinate as
```
x = w*d/z
```

Where w = half the width of the road (from camera to road edge)

You can see that for both x and y, what we are really doing is scaling by a factor of
```
d/z
```

More formally we should be:

1. translating: from world coordinates to camera coordinates
2. projecting: camera coordinates onto a normalized projection plane
3. scaling: the projected coordinates to physical screen (in our case canvas) coordinates

![formula 1](plan/formula1.png)

Projection
And so we can present our formal projection equations as follows:



The translate equations calculate the point relative to the camera
The project equations are variations of our ’law of similar triangles’ above
The scale equations take into account the difference between:
math - where 0,0 is at the center and the y axis goes up and
computers - where 0,0 is at the top-left and the y axis goes down, as shown below:
![formula 1](plan/formula2.png)



### Some More Trigonometry

One last piece of the puzzle is how to calculate d - the distance from the camera to the projection plane.

Instead of hard coding a value for d, its more useful to derive it from the desired vertical field of view. This way we can choose to ‘zoom’ the camera if needed.

Assuming we are projecting onto a normalized projection plane, with coordinates from -1 to +1, we can calculate d as follows:
```
d = 1/tan(fov/2)
```
Setting up fov as one (of many) variables we will be able to tweak in order to fine tune the rendering algorithm.



### Javascript Code Structure
I mentioned in the introduction that this code does not exactly follow javascript best practices - its a quick and dirty demo with simple global variables and functions. However, since I am going to build 4 separate versions (straights, curves, hills and sprites) I will keep some re-usable methods inside common.js within the following modules:

Dom - a few minor DOM helpers.
Util - generic utilities, mostly math helpers.
Game - generic game helpers such as an image loader and the game loop.
Render - canvas rendering helpers.
I will only be detailing methods from common.js if they are relevent to the actual game, rather than just simple DOM or math helpers. Hopefully you can tell from the name and context what the methods are supposed to do.

As usual, the source code is the final documentation.