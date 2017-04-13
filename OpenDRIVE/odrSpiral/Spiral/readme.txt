    Copyright 2010 VIRES Simulationstechnologie GmbH

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.


This small collection of routines shall illustrate the computation of Euler
spirals as they are to be used in OpenDRIVE applications.

The methods have been realized using the CEPHES library 

http://www.netlib.org/cephes/

and do neither constitute the only nor the exclusive way of implementing spirals for 
OpenDRIVE applications. Their sole purpose is to facilitate the interpretation
of OpenDRIVE spiral data.

All software is provided "AS IS".

In order to compile the example, e.g. use the GNU C-Compiler

gcc odrSpiral.c main.c -lm

The result will be the executable "a.out". Running it will result
in a table of x/y values for a sample spiral.



March 09, 2010
VIRES Simulationstechnologie GmbH


