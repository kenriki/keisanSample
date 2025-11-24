package com.cinqprobe.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AppController {
    @GetMapping("/hello")
    public String index() {
        return "Hello World!";
    }
    @GetMapping("/hoge")
    public String hoge() {
        return "hogehoge";
    }
}