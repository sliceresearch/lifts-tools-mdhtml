title: PowerPoint Presentation
subject: None
description: Adapted from Liang: Intro to Java, 10th Edition
creators: 
last_modified_by: Mark Utting
created: 2017-01-06T03:46:45Z
last_modified_at: 2019-02-26T09:23:43Z

-----

##  Week 1Java Intro

* ICT221 Object-Oriented Programming

* Liang Chapters 1-6!



-----

## 
-----

##  Goal: learn object-oriented programming (OOP)
* Subgoals: learn seven important industry skills			Weeks
* Java (the #1 object-oriented programming language)		1-15
* IntelliJ IDEA: a modern IDE for Java				1-13
* Unit testing and test-driven development (TDD)		3-12
* Event-driven programming for GUI development		5-13
* Pair-programming and team skills				1-8
* Distributed source-code version control (git)			2-13
* Self-learning skills					1-13

![](images/ICT221_Week01_Java_Intro_image4.png)

![](images/ICT221_Week01_Java_Intro_image5.tiff)

* 10th Edition

* 11th Edition

![](images/ICT221_Week01_Java_Intro_image6.jpg)


-----

##  Exercise: install JetBrains IntelliJ IDEA

* Go to:  https://www.jetbrains.com/idea/download 
* Download and install the Community Edition (426Mb)


>>>* Wait until most students have *started* this download, then carry on with the lecture.
>>>* They can install it later in the lecture, after the download completes.

-----

##  Weekly readings from text book

    * ("Intro to Java, 11th Edition Brief", by Liang)
Two-hour lecture (second hour: demos and interactive tasks) 
Two-hour weekly Lab (pair programming with GIT)
	Weeks 1-4: Math quiz game for school students		10%
	Weeks 5-8: Garden planner with JavaFX GUI 			10%           Task 1
Two-hour online programming tutorials (weeks 1-7)		10%
Assignment: JavaFX GUI interface (weeks 9-12)			30%   Task 2
Exam									40%   Task 3


![](images/ICT221_Week01_Java_Intro_image6.jpg)



-----

##  Pair-Programming?
* Defn: two programmers sharing a single workstation 
* 	(one screen, keyboard and mouse among the pair). 
* the programmer at the keyboard is usually called the "driver"
* the other, also actively involved in the programming task but focusing more on overall direction is the "navigator";
* the programmers swap roles every few minutes or so
* Benefits:
* increased code quality (eg. ½ the bugs, with 0-15% extra cost)
* diffusion of knowledge among the team (shared ownership)
* better transfer of skills
* improved resiliency to interruptions
* See: http://guide.agilealliance.org/guide/pairing.html

![](images/ICT221_Week01_Java_Intro_image6.jpg)


-----

##  Learning Java

* You already know how to program in Python
* Now you must transfer those skills to Java:

    * Ideas are the same (loops, functions, etc.)
    * Syntax is a bit different:
    * Python:  if x == 0: print(“Done”)
    * Java:      if (x == 0) { System.out.println(“Done”); }
    * Python:  size = 0   . . .   size += 1
    * Java:      int size = 0; . . .   size += 1;
    * 
    * 


>>>* Ask students to point out the differences they see.
>>>* Discuss especially:
>>>* {...} instead of : and indentation.
>>>* types when variables are declared
>>>* semicolons

-----

##  Learning to learn

* Programmers must often learn new languages

    * We expect you to teach yourself basic ‘imperative’ programming in Java (Chapters 1-7 of textbook)
    * (variables, if-else, loops, functions/methods, arrays)
    * Readings and homework exercises each week
    * This course will teach you new concepts (in Java):
    * Object-oriented programming
    * UML class diagrams
    * Object association, composition, inheritance
    * Event-based programming (building GUIs)
    * 



-----

##  Jobs: What do Employers want?

* From our recent workshop with local software employers.
* Their top requirements for new IT graduates:
* soft skills (Can work in a team!  Can present solutions confidently)
* self-learners (IT is constantly changing.  "Go and learn XYZ")
* problem solving ability
* design skills


>>>* We have modified ICT221 to address these requirements:
>>>* more team work (pair programming) and learning how to collaborate using Git
>>>* more self-learning practice, so you become expert at quickly learning new skills online

-----

##  Self-paced learning

* Why is self-learning so important now?
* IT changes so fast.  Every 3-5 years, you will need to learn new skills...
* Employers expect you to be able to self-learn...
* Australia AQF level 7 requires self-learning...  (see next slide)
* It's the best way for you to learn the basics (Java syntax etc.)

    * while this course teaches you the higher-level skills of OOP
    * So you must do both concurrently: 
    * self-learn the basics with EdX
    * plus group-learn the higher-level skills in lectures and workshops
    * 


>>>* Examples of higher-level skills taught in ICT221:
>>>* different programming paradigms: batch versus event-driven
>>>* unit testing and guidelines for doing it well
>>>* GUI design and good use of layouts
>>>* object-oriented design – good versus bad use of objects

-----

## ![](images/ICT221_Week01_Java_Intro_image7.png)

![](images/ICT221_Week01_Java_Intro_image8.png)

>>>* Point out the "further learning" in the summary, and the "self-directed work and learning" in the Application section.
>>>* Also, point out the emphasis on 'soft skills', such as "communication skills", "transmit knowledge, skills and ideas to others" etc.

-----

##  Exercise: EdX course for Java  (Self-learning)

* Register for an EdX account at  https://www.edx.org 

    * Email: Use your USC email
    * Public username: Use "usc19xxxNNN", where xxxNNN is your USC username
Enrol in Microsoft DEV276x "Learn to Program in Java"
    * Search:  Java   (and then select 'Self-Paced' to narrow down the options)
    * Look for Microsoft "Learn to Program in Java"
    * Click on: View Course Syllabus
    * Do: Module 2 Control Structures this week
Create a PracticeIT account at https://practiceit.cs.washington.edu 
    * Use your USC email and the same "usc19xxxNNN" username as above.


>>>* Lecturer: 
>>>* Demonstrate each of the above steps, and get students to follow you.
>>>* Point out how many Java courses there are (but this includes JavaScript too).
>>>* Get into Microsoft DEV276x and go through the first few pages of Module 1 as a demo.
>>>* Demo:
>>>* video (demo the speed and volume control), and the transcript on the right
>>>* the textual summary below the video.  It is often quicker to read this first, and then only watch/read the video if you want extra explanation.
>>>* the self-test questions
>>>* When you get to the "Strings and Printlns" page (inside "Basic Java Commands"), demo:
>>>    * click on "BJP4 Exercise 1.3: WellFormed"   - it will take you to your PracticeIT account.
>>>    * have a go at solving this problem (ask students what to do at each step).

-----

##  Chapter 1 Introduction to Programs, Compilers, and Java




* Week 1 Reading:
* Chapter 1, Sections 1.3, 1.7-1.8 (How Java works)
* Chapter 3, Sections 3.1-3.6 (if-else in Java)
* Chapter 5, Section 5.1-5.2.3 and 5.4 (loops in Java)

![](images/ICT221_Week01_Java_Intro_image9.jpg)


-----

##  Popular High-Level Languages




-----

##  Why Java?

* Most popular programming language in the world
* & most popular paradigm (object-oriented)


![](images/ICT221_Week01_Java_Intro_image11.png)


-----

##  Java (JDK) Versions

* JDK 1.02 (1995)
* JDK 1.1 (1996)
* JDK 1.2 (1998)
* JDK 1.3 (2000)
* JDK 1.4 (2002)
* JDK 1.5 (2004) a. k. a. JDK 5 or Java 5
* JDK 1.6 (2006) a. k. a. JDK 6 or Java 6
* JDK 1.7 (2011) a. k. a. JDK 7 or Java 7
* JDK 1.8 (2014) a. k. a. JDK 8 or Java 8



-----

##  JDK Editions

* Java Standard Edition (J2SE)

    * J2SE can be used to develop client-side standalone applications or applets.
Java Enterprise Edition (J2EE)
    * J2EE can be used to develop server-side applications such as Java servlets, Java ServerPages, and Java ServerFaces. 
Java Micro Edition (J2ME). 
    * J2ME can be used to develop applications for mobile devices such as cell phones. 
This book uses J2SE to introduce Java programming. 



-----

##  Popular Java IDEs  (2016)

* Eclipse					48%
* IntelliJ IDEA (JetBrains)		33%
* NetBeans					10%
* Others, and Text Editors		  9%

    * Popular text editors: vi/vim, emacs, Notepad++, ...


>>>* Note: the 2017 Stackoverflow.com survey of ALL developers has IntelliJ (23.0%) higher than Eclipse (20.0%)

-----

##  A Simple Java Program

* // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Run

* Welcome

* Listing 1.1


* Animation

>>>* Ask students what is unusual/unfamiliar about this program.

-----

##  Creating and Editing Using WordPad

* To use WordPad, type 

    * write Welcome.java 
from the DOS prompt.

![](images/ICT221_Week01_Java_Intro_image12.png)



![](images/ICT221_Week01_Java_Intro_image13.png)

* For interest only – we will use IntelliJ IDEA IDE, Not WordPad


-----

## ![](images/ICT221_Week01_Java_Intro_image14.png)

* Creating, Compiling, and Running Programs

![](images/ICT221_Week01_Java_Intro_image15.png)

* IntelliJ IDEA does all this automatically…


-----

##  Compiling Java Source Code

* You can port a source program to any machine with appropriate compilers. The source program must be recompiled, however, because the object program can only run on a specific machine. Nowadays computers are networked to work together. Java was designed to run object programs on any platform. With Java, you write the program once, and compile the source program into a special type of object code, known as bytecode. The bytecode can then run on any computer with a Java Virtual Machine, as shown below. Java Virtual Machine is a software that interprets Java bytecode. 



![](images/ICT221_Week01_Java_Intro_image16.png)


-----

##  Compiling and Running Java from the Command Window

* Set path to JDK bin directory

    * set path=c:\Program Files\java\jdk1.8.0\bin
Set classpath to include the current directory
    * set classpath=.
Compile
    * javac Welcome.java
Run
    * java Welcome


![](images/ICT221_Week01_Java_Intro_image17.png)

* Companion Website

* Again, IntelliJ IDEA does all this automatically…


-----

##  Anatomy of a Java Program

* Class name
* Main method
* Statements
* Statement terminator
* Reserved words
* Comments
* Blocks


-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Class Name


* Every Java program must have at least one class. Each class has a name. By convention, class names start with an uppercase letter. In this example, the class name is Welcome. 


-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Main Method


* Line 2 defines the main method. In order to run a class, the class must contain a method named main. The program is executed from the main method. 


-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Statement


* A statement represents an action or a sequence of actions. The statement System.out.println("Welcome to Java!") in the program in Listing 1.1 is a statement to display the greeting "Welcome to Java!“.


-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Statement Terminator


* Every statement in Java ends with a semicolon (;).


-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* Reserved words



* Reserved words or keywords are words that have a specific meaning to the compiler and cannot be used for other purposes in the program. For example, when the compiler sees the word class, it understands that the word after class is the name for the class. 


-----

##  Blocks








* A pair of braces in a program forms a block that groups components of a program. 



-----

##  Special Symbols



-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* {  … }






-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* (  …  )






-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* ;



-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* // …



-----

##  // This program prints Welcome to Java! 
* public class Welcome {	
*   public static void main(String[] args) { 
*     System.out.println("Welcome to Java!");
*   }
* }

* " … "




-----

##  Programming Errors

* Syntax Errors

    * Detected by the compiler
    * (includes type errors, unlike Python)
Runtime Errors
    * Causes the program to abort
    * eg. divide by zero
Logic Errors
    * Program finishes, but produces incorrect output!


-----

##  Python vs Java summary

* Spot the differences…












>>>* Ask students what differences they can see.

-----

##  Demo+Exercise: Java Basics (in IntelliJ IDEA)

* Open IntelliJ IDEA
* Create New Project (Java program, no additional libraries)

    * click Next, then choose Java Hello World template
    * choose a project name 'ict221_mathgame' and note WHERE it will be located
Run your Java program:
    * open up the project, the 'src' folder, the 'Main' class in the editor
    *  use 'Run' menu, then 'Run Main'.


>>>* Lecturer: Open up IntelliJ IDEA and get students to do the same on their laptops (in pairs or groups if necessary).
>>>* Demonstrate how to create a project and a class, as above.
>>>* Demonstrate some features of Java, like declaring and using a local var:  String msg = "...";    
>>>* Then a while loop to print it 10 times.
>>>* Then show how the while loop can be written more concisely as a 'for' loop.
>>>* Then demonstrate printf.  For example:  System.out.printf("%4d %s\n", i, msg); 

